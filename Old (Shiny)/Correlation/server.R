#
# This is the server logic for a Shiny web application.
# You can find out more about building applications with Shiny here:
#
# http://shiny.rstudio.com
#
# Preliminary load of libraries --------------------------
library(shiny)
library(shinyjs)
library(foreign)
library(ggplot2)
library(haven)
#library(readxl)
library(xlsx)
library(dplyr)
library(reshape2)
library(RColorBrewer)
library(psych)
library(tidyr)
library(GeneNet)
library(Rgraphviz)
library(plyr)
library(d3heatmap)

# load the cohort and  metadata into a list for use in analyses, eventually from ewy's QC
#cohort.data<-readData()

load("uids.Rda")



# cohort_metmatch function ---------------------
# Validate metabolite names
# expects correlation matrix with rows to match names of metabolites specified as
# cohortmet

cohort_metmatch <- function(corrmat,adduinfo = c("UID_01")) {
  # add metabolite name as column
  corrmat$metname <- rownames(corrmat)
  
  # convert to table for dplyr functions
  mettbl <- as.tbl(corrmat)
  
  # convert to table for dplyr functions only keep specified uinfo
  uidtbl <-
    as.tbl(select(uids,one_of(
      c(adduinfo,"BIOCHEMICAL",input$cohortmet)
    )))
  
  # matched metabolite names
  lmatched <-
    left_join(mettbl,uidtbl, by = c("metname" = input$cohortmet))
  
  # unmatched metabolite names
  unmatched <-
    anti_join(mettbl,uidtbl, by = c("metname" = input$cohortmet))
  
  #tabulate findings, those with biochemical = NA did not find a match
  metcnt <- table(lmatched[,"BIOCHEMICAL"] == "NA",exclude = NULL)
  names(metcnt) <- c("Harmonized","Unmatched")
  
  
  return(lmatched)
}




# cohort_corr function ----------------------------------------
cohort_corr <-
  function(model,data,ccovars = c("age"),adjvars = "",rcovars = "") {
    #     # column indices of metabolites
    #     allmetabs<-unlist(select(uids, ends_with("_NAME")))
    #     allmetabs<-allmetabs[!is.na(allmetabs)] # take out NAs
    #     allmetabs<-allmetabs[allmetabs] # take out NAs
    
    
    col.rcovar <- match(rcovars,names(data))
    
    # column indices of column covariates
    col.ccovar <- match(ccovars,names(data))
    
    # column indices of adj-var
    col.adj <- match(adjvars,names(data))
    
    
    if (length(adjvars) == 0) {
      # calculate unadjusted spearman correlation matrix
      corr <-
        cor(as.data.frame(data[,c(col.rcovar,col.ccovar)]),method = "spearman",use = "pairwise.complete.obs")[1:length(col.rcovar),-(1:length(col.rcovar))]
      
      # calculate complete cases matrix
      n  <-
        matrix(NA,nrow = length(col.rcovar),ncol = length(col.ccovar))
      for (i in 1:length(col.ccovar)) {
        n[,i] <-
          apply(data[,col.rcovar],2, function(j)
            sum(complete.cases(cbind(j,data[,c(col.ccovar[i])]))))
      }
    }
    else {
      # calculate partial correlation matrix
      corr <-
        partial.r(data, c(col.rcovar,col.ccovar), col.adj)[1:length(col.rcovar),-(1:length(col.rcovar))]
      # calculate complete cases matrix
      n  <-
        matrix(NA,nrow = length(col.rcovar),ncol = length(col.ccovar))
      for (i in 1:length(col.ccovar)) {
        n[,i] <-
          apply(data[,col.rcovar],2, function(j)
            sum(complete.cases(cbind(j,data[,c(col.ccovar[i],col.adj)]))))
      }
      
      
    }
    
    corr <- as.matrix(round(corr, digits = 3))
    colnames(corr) <- ccovars
    
    
    colnames(n) <- paste(ccovars,"n",sep = "")
    
    # combine the two matrices together as data frame
    corrmat <- as.data.frame(cbind(corr,n))
    
    
    # comment(corrmat) <- paste(input$cohort,model,' ',toString(adj))
    
    return(corrmat)
  }

#################################################################################
#
# Fix dataframe from excel -----------------------------------------------------
#
#################################################################################
fixData <- function(dta) {
  # run through the data
  colnames(dta) <- tolower(colnames(dta))
  
  cls <- sapply(dta, class)
  # do conversions for data types: integer to numeric and dates are identified by date in name
  
  if (length(which(cls == "integer")) > 0) {
    for (ind in which(cls == "integer"))
      dta[,ind] <- as.numeric(dta[,ind])
  }
  
  if (length(which(cls == "factor")) > 0) {
    for (ind in which(cls == "factor"))
      dta[,ind] <- as.character(dta[,ind])
  }
  
  # do conversions for data types:  dates are identified by finding string date in name
  if (length(grep("date",colnames(dta))) > 0) {
    for (ind in grep("date",colnames(dta))) {
      if (length(grep(".xpt", inFile,ignore.case = TRUE)) > 0) {
        dta[,ind] <- as.Date(dta[,ind], origin = "1960-01-01")
      }else{
        dta[,ind] <- as.Date(dta[,ind])
      }
      
    }
  }
  
  return(dta)
}






#################################################################################
#
# Shiny functions          -----------------------------------------------------
#
#################################################################################
shinyServer(function(input, output) {
  # Function for individual cohort correlations -------------------------------
  
  
  
  output$contents <- renderPrint({
    summary(readData()[[1]])
  })
  
  
  #----------------------------------------------------------------
  # read data from excel file
  #----------------------------------------------------------------
  readData <- reactive({
    # input$file1 will be NULL initially. After the user selects
    # and uploads a file, it will be a data frame with 'name',
    # 'size', 'type', and 'datapath' columns. The 'datapath'
    # column will contain the local filenames where the data can
    # be found.
    inFile <- input$file1
    
    if (is.null(inFile))
      return(NULL)
    
    #  print(inFile$datapath)
    else if (length(grep(".xlsx", input$file1, ignore.case = TRUE)) > 0) {
      xlfile <- inFile$datapath
      
      dta.metab <- read.xlsx(xlfile,1)  #metabolite meta data
      dta.smetab <- read.xlsx(xlfile,2) #subject metabolite data
      dta.sdata <- read.xlsx(xlfile,3)  #subject data
      dta.vmap <- read.xlsx(xlfile,4)   #variable mapping
      dta.models <- read.xlsx(xlfile,5) #batch model specifications
    }
    
    # fixData to comply with R conventions
    dta.metab <- fixData(dta.metab)
    dta.smetab <- fixData(dta.smetab)
    dta.sdata <- fixData(dta.sdata)
    dta.vmap <- fixData(dta.vmap)
    dta.models <- fixData(dta.models)
    
    # convert metabolite_id names to lower case
    dta.metab$metabolite_id <- tolower(dta.metab$metabolite_id)
    
    #rename variables if batch mode so we can run models
    
    dta <- inner_join(dta.sdata,dta.smetab)
    
    if (input$modelspec == 'Batch') {
      # take only vars that are named differently for the cohort
      tst<-filter(dta.vmap,!is.na(cohortvariable))
      
      newnames <- mapvalues(names(dta),
                            from = c(tst$cohortvariable),
                            to = c(tst$varreference))
      
      names(dta) <- newnames
    }
    
    # run through all vmap specifications to create variables
    
    # Create list for output
    # 1 = subj data - subjdata
    # 2 = metabolite var list - allMetabolites
    # 3 = subjectID variable subjId
    # 4 = metabolite metadata
    # 5 = models
    dtalist <- list(
      subjdata = dta,
      allMetabolites = dta.metab$metabolite_id,
      subjId = dta.vmap$cohortvariable[dta.vmap$varreference ==
                                         'id'],
      metab = dta.metab,
      mods = dta.models
    )
    return(dtalist)
  })
  
  #----------------------------------------------------------------
  # establish working data
  #----------------------------------------------------------------
  getData <- reactive({
    if (input$modelspec == "Interactive") {
      # adjust the variable names
      if (is.na(match("All metabolites",input$rowvars)) == FALSE)
        rcovs <-
          unique(c(input$rowvars[input$rowvars != "All metabolites"],c(readData()[[2]])))
      else
        rcovs <- input$rowvars
      
      if (is.na(match("All metabolites",input$colvars)) == FALSE)
        ccovs <-
          unique(c(input$colvars[input$colvars != "All metabolites"],c(readData()[[2]])))
      else
        ccovs <- input$colvars
      
      acovs <- input$adjvars
    }
    else if (input$modelspec == "Batch") {
      # here we need to get the covariates defined from the excel sheet
      # step 1. get the chosen model first
      mods<-as.data.frame(readData()[[5]])
      mods<-filter(mods,model==input$modbatch)
      
      if (mods$outcomes=="All metabolites")
        rcovs<-c(readData()[[2]])
      else 
        rcovs<-as.vector(strsplit(mods$outcomes," ")[[1]])
      
      if (mods$exposure=="All metabolites")
        ccovs<-c(readData()[[2]])
      else 
        ccovs<-as.vector(strsplit(mods$exposure," ")[[1]])
      
      if (!is.na(mods$adjustment))
        acovs<-as.vector(strsplit(mods$adjustment," ")[[1]])
      else acovs<-NULL
      
    }
    
    
    # merge smetab
    if (length(acovs) == 0)
      gdta <-
        subset(as.data.frame(readData()[[1]]),select = c(ccovs,rcovs))
    else
      gdta <-
        subset(as.data.frame(readData()[[1]]),select = c(acovs,ccovs,rcovs))
    
    # list for subset data
    # 1: subset data: gdta
    # 2: column variables: ccovs
    # 3: row variables: rcovs
    return(list(
      gdta = gdta,ccovs = ccovs,rcovs = rcovs,acovs=acovs
    ))
  })
  
  
  
  
  
  
  ################################################################
  #
  # dump data to R -----------------------------------------------
  #
  ################################################################
  output$downloadDump <- downloadHandler(
    filename = "Rdata.R",
    content = function(con) {
      #assign(inputx, readData())
      
      dump(readData()[[1]], con) # output the data to file con
    }
  )
  
  ### Download save:
  
  #----------------------------------------------------------------
  # save as R data
  #----------------------------------------------------------------
  output$downloadSave <- downloadHandler(
    filename = function() {
      fname = gsub('.','_',tolower(input$cohort), fixed = TRUE)
      paste(fname,"%03d",'.RData',sep = '')
    },
    content = function(con) {
      #assign(input,readData())
      #dta<-readData()
      save(readData()[[1]], file = con) # output data
    }
  )
  
  #----------------------------------------------------------------
  # save as Csv file
  #----------------------------------------------------------------
  output$downloadData <- downloadHandler(
    filename = function() {
      fname = gsub('.','_',tolower(input$cohort), fixed = TRUE)
      paste(fname,"%03d",'.csv',sep = '')
    },
    content = function(file) {
      write.csv(getCorr(), file)
    }
  )
  
  
  output$heatPlot <- renderPlot({
    if (length(input$file1)==0 | length(getData()[[2]]) == 0 |
        length(getData()[[3]]) == 0) {
      return(NULL)
    }
    ccorrmat <- getCorr()
    
    # order the rows according to sort by
    if (input$sortby=="metasc")
      ccorrmat$metabolite_name <-
        factor(ccorrmat$metabolite_name,levels = 
                 ccorrmat$metabolite_name[rev(order(unlist(ccorrmat["metabolite_name"])))])
    else                                                                       
    ccorrmat$metabolite_name <-
      factor(ccorrmat$metabolite_name,levels = ccorrmat$metabolite_name[order(unlist(ccorrmat[input$sortby]))])
    
    # stack the correlations together
    testcorg <-
      gather(ccorrmat,"covariate","corr",1:length(getData()[[2]]))
    
    # render ggplot of heatmap
    dtaView <- ggplot(testcorg, aes(covariate, metabolite_name)) +
      geom_tile(aes(fill = corr)) +
      geom_text(aes(label = corr),colour = "white",size = 9) +
      ylab(" ") +
      xlab(" ") +
      theme_classic() +
      theme(
        axis.text = element_text(size = 20),
        legend.text = element_text(size = 20),
        axis.ticks = element_line(colour = "white")
      )
    
    
    dtaView
  })
  
  output$networkPlot <- renderPlot({
    if (length(input$file1)==0 | length(getData()[[2]]) == 0 |
        length(getData()[[3]]) == 0) {
      return(NULL)
    }
    
    pc = ggm.estimate.pcor(getData()[[1]])
    
    edges = network.test.edges(pc,
                               direct = FALSE,
                               fdr = TRUE,
                               plot = FALSE)
    
    net = extract.network(edges,cutoff.ggm = input$cutggm)
    
    set.seed(1)
    labels <- colnames(getData()[[1]])
    
    igNet = network.make.graph(net,labels,drop.singles = TRUE)
    
    attrs <-
      list(
        node = list(
          shape = "ellipse", fixedsize = FALSE,fillcolor = "darkblue",fontcolor =
            "white"
        )
      )
    plot(igNet, "fdp",attrs = attrs)
    
  })
  
  
  # Get correlation matrix
  getCorr <- reactive({
    
    
    if (length(getData())==0)
      return(NULL)
    
    # get correlation matrix
    dtacorr <-
      cohort_corr(
        input$cohort,as.data.frame(getData()[[1]]),
        rcovars = c(getData()[[3]]),
        adjvars = c(getData()[[4]]),
        ccovars = c(getData()[[2]])
      )
    
    dtacorr$metabolite_id <- rownames(dtacorr)
    ccorrmat <-
      inner_join(dtacorr,as.data.frame(readData()[[4]]))
    if (input$modelspec=='Interactive')
      ccorrmat$model <- input$model
    else if (input$modelspec=='Batch')
      ccorrmat$model <- input$modbatch
    ccorrmat$adjvars <- paste(getData()[[4]],collapse = " ")
    ccorrmat$cohort<-input$cohort
    ccorrmat <- select(ccorrmat,-metabolite_id)
    return(ccorrmat)
  })
  
  
  
  
  # Render heatmap of correlations-------------------------
  
  # ccorrmat$metabolite <- with(ccorrmat, reorder(metabolite,input$sortby))
  testcorg <- reactive({
    gather(getCorr(),"covariate","corr",1:length(input$xvars))
    
    testcorg %>%
      ggvis( ~ covariate, ~ metabolite,fill =  ~ corr) %>%
      layer_rects(width = band(), height = band()) %>%
      layer_text(
        x = prop("x", ~ covariate, scale = "xcenter"),
        y = prop("y", ~ metabolite, scale = "ycenter")
        #  text: =  ~ Freq, fontSize: = 20, fill: = "white", baseline: =
        #    "middle", align: = "center"
      ) %>%
      scale_nominal("x", padding = 0, points = FALSE) %>%
      scale_nominal("y", padding = 0, points = FALSE) %>%
      scale_nominal("x", name = "xcenter", padding = 1, points = TRUE) %>%
      scale_nominal("y", name = "ycenter", padding = 1, points = TRUE) %>%
      bindshiny("ggvis")
    
  })
  
  
  # Choose sorting option --------------------------------------
  output$selectSort <- renderUI({
    # x-var should be numeric only...
    nms <- c(getData()[[2]])
    
    if (is.null(labs)) {
      NULL
    }else{
      selectInput(
        "sortby", label = "Select sort:",
        choices = c("Alphabetic (asc)" = "metasc","Alphabetic (desc)" = "metabolite_name",nms)
      )
    }
  })
  
  
  # output choice for adjusted vars
  output$xvars <- renderUI({
    # Look through the data...
    
    
    if (is.null(labs)) {
      NULL
    }else{
      list(
        selectizeInput(
          "rowvars", label = "  Select outcomes(s):",
          choices = c("All metabolites",colnames(readData()[[1]])), multiple = TRUE,
          selected = "All metabolites"
        ),
        selectizeInput(
          "colvars", label = "  Select exposures(s):",
          choices = c("All metabolites",colnames(readData()[[1]])), multiple = TRUE
          
        ),
        selectizeInput(
          "adjvars", label = "  Adjusted covariates:",
          choices = c(colnames(readData()[[1]])), multiple = TRUE
        )
      )
    }
    
  })
  
  # output choice for model if batch mode
  output$xmods <- renderUI({
    # Look through the data...
    
    
    modchoices<-as.data.frame(readData()[[5]])
    if (is.null(names(modchoices)) & input$modelspec == 'Batch') {
      NULL
    }else{
      
      selectInput(
        "modbatch", label = "  Choose model:",
        c(as.character(modchoices$model))
      )
    }
    
  })
  
  
  
  # get the models to choose from
  # output choice for adjusted vars
  output$modelopts <- renderUI({
    # Look through the data...
    
    
    if (is.null(labs)) {
      NULL
    }else{
      list(
        selectInput(
          "modopts", label = "  Choose model:",
          choices = c("All metabolites",colnames(readData()[[1]])), multiple = TRUE
        ),
        selectizeInput(
          "colvars", label = "  Outcomes:",
          choices = c("All metabolites",colnames(readData()[[1]])), multiple = TRUE
        ),
        selectizeInput(
          "adjvars", label = "  Adjusted covariates:",
          choices = c(colnames(readData()[[1]])), multiple = TRUE
        )
      )
    }
    
  })
  
  
  output$correlate <- renderDataTable({
    if (length(input$file1)==0)
      return(NULL)
    ccorrmat <- getCorr()
    
    
    if (is.null(ccorrmat))
      return("No harmonization performed; correlation matrix was not calculated")
    #tabulate findings, those with biochemical = NA did not find a match
    metcnt <- ccorrmat
    return(metcnt)
  })
  
  output$cheatmap <- renderD3heatmap({
    corr<-getCorr()
    rownames(corr)<-corr$metabolite_name
    ncols<-length(getData()[[2]])
    print(corr[,1:ncols])
    d3heatmap(
      corr[,1:ncols],
      colors = input$palette,
      dendrogram = if (input$cluster) "both" else "none"
    )
  })
})
