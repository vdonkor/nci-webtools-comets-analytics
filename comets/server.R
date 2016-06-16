#
# This is the server logic for a Shiny web application.
# You can find out more about building applications with Shiny here:
#
# http://shiny.rstudio.com
#
# Preliminary load of libraries --------------------------
library(shiny)
library(shinyjs)
library(ggplot2)
#library(haven)
library(readxl)
#library(xlsx)
library(plyr)
library(dplyr)
library(reshape2)
library(RColorBrewer)
#library(ppcor)
library(psych)
library(tidyr)
library(GeneNet)
library(Rgraphviz)
library(d3heatmap)
library(plotly)
#options(shiny.error = browser)


# load the cohort and  metadata into a list for use in analyses, eventually from ewy's QC
#cohort.data<-readData()

#load("uids.Rda")


# print debug time
prdebug<-function(lab,x){
  print(paste(lab," = ",x," Time: ",Sys.time()))
}
dobug<-FALSE

#################################################################################
#
# Fix dataframe from excel -----------------------------------------------------
#
#################################################################################
fixData <- function(dta) {
  # run through the data
  colnames(dta) <- tolower(colnames(dta))
  
  # remove rows that have all NAs (EM)
  countnas=as.numeric(apply(data.frame(dta),1,function(x) length(which(is.na(x)))))
  if (length(which(countnas==ncol(dta)))>0) {
  	dta=dta[-c(which(countnas==ncol(dta))),]
  }

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
#   
#   # do conversions for data types:  dates are identified by finding string date in name
#   if (length(grep("date",colnames(dta))) > 0) {
#     for (ind in grep("date",colnames(dta))) {
#       if (length(grep(".xpt", inFile,ignore.case = TRUE)) > 0) {
#         dta[,ind] <- as.Date(dta[,ind], origin = "1960-01-01")
#       }else{
#         dta[,ind] <- as.Date(dta[,ind])
#       }
#       
#     }
#  }
  
  return(dta)
}

#################################################################################
# Get metabolite statistics (# missing values, variance)
#################################################################################
GetMetabStats <- function(dtalist) {
	#toremove=as.numeric(lapply(c(mydat$allSubjectMetaData,mydat$subjId),
	#	function(x) which(colnames(mydat$subjdata)==x)))
	#mymets=colnames(mydat$subjdata)[-c(toremove)]

	mymets=dtalist$metab[[dtalist$metabId]]	
	log2metvar=as.numeric(lapply(mymets, function(x) {
		temp=which(colnames(dtalist$subjdata)==x)
		if(length(temp)==0) {return(NA)}
		else return(var(log2(dtalist$subjdata[[x]])))
	}))
	nummissing=as.numeric(lapply(mymets, function(x) {
		temp=which(colnames(dtalist$subjdata)==x)
		if(length(temp)==0) {return(NA)}
		else return(length(which(dtalist$subjdata[[x]]==min(dtalist$subjdata[[x]])))-1)
	}))

	dtalist$metab$log2var=log2metvar
	dtalist$metab$nummissing=nummissing
	return(dtalist)
}

#################################################################################
# Harmonize Metabolites (for correlation tab, internal function)
#################################################################################
Harmonize <- function(dtalist) {
        masteruids=read.delim("uid.csv",sep=",",header=T,fileEncoding="latin1")
        mycols=c(which(colnames(masteruids)=="UID_01"),
                which(colnames(masteruids)=="BIOCHEMICAL"),grep("_NAME", colnames(masteruids)))
  #      print("Using columns: ",mycols)

        #resharm=Harmonizeids(metametab=dtalist$metab, mycols, masteruids)
        metametab=dtalist$metab
        if (is.null(metametab)) {return(NULL)}
        else {
        harmflag=cohortfound=multrows=othercohortfound=myuids=otheruids=as.vector(rep(NA,nrow(metametab)))
        harmind=c()
        metabcol=1
        response=0
    repeat {
        response=length(which(harmflag=="N"))+length(which(is.na(harmflag)))
 #       print(paste("response:",response,"metabcol:",metabcol))

    if (response > 0 && metabcol<=ncol(metametab)) {
        metabcol=metabcol+1
#        print(paste("Going through column",metabcol))
        mymetabs=metametab[[metabcol]]
        for (i in 1:length(mymetabs)) {
          # Get rows where name columns match the input metabolite name (i)
           temp=as.character(lapply(mycols,function(x)
                paste(unique(which(tolower(as.character(masteruids[,x]))==tolower(as.character(mymetabs[i])))),sep=";",collapse=";")
                ))
           myrows=setdiff(unique(strsplit(paste(temp,sep=";",collapse=";"),";")[[1]]),"")
           if (length(myrows)==0) {harmflag[i]="N"}
           else {harmflag[i]="Y";multrows[i]="N"}
           cohortfound[i]=paste(colnames(masteruids)[which(masteruids[myrows[1],mycols]==tolower(mymetabs[i]))],sep=";",collapse=";")
           myuids[i]=as.character(masteruids[myrows[1],"UID_01"])
           if(length(myrows)>1) {
                for (j in 2:length(myrows)) {
                        multrows[i]="Y"
                        othercohortfound[i]=paste(othercohortfound[i],
                                paste(colnames(masteruids)[which(tolower(unlist(masteruids[myrows[j],mycols]))==tolower(mymetabs[i]))],sep=";",collapse=";"),
                                sep=";")
                        otheruids[i]=paste(otheruids[i],paste(masteruids[myrows[j],"UID_01"],sep=";",collapse=";"),sep=";")
                }
                # Remove prefix "__"
                othercohortfound[i]=sub("NA;","",othercohortfound[i])
		othercohortfound[i]=unique(paste(unlist(strsplit(othercohortfound[i],"__"))),sep=";")
                otheruids[i]=sub("NA;","",otheruids[i])
		otheruids[i]=unique(paste(unlist(strsplit(otheruids[i],"__"))),sep=";")
          }

        }
        } else{break;}
        }
        dtalist$metab$Harmonized=harmflag
        dtalist$metab$UID_01=myuids
        dtalist$metab$cohort_platform=cohortfound
        dtalist$metab$UID_other=otheruids
        dtalist$metab$cohort_other=othercohortfound
        dtalist$metab$multrows=multrows
        return(dtalist)
        }
}


#################################################################################
# Integrity check of input Excell file
#################################################################################
CheckIntegrity <-
  function (dta.metab,dta.smetab, dta.sdata,dta.vmap) {
    # dta.metab = metabolite meta data (sheet 1)
    # dta.smetab = abundance data (sheet 2)
    # dta.sdata = subject meta data (sheet 3)
    # dta.vmap = variable mapping data (sheet 4)
    
    # get the cohort equivalent of metabolite_id and subject id
    metabid = tolower(dta.vmap$cohortvariable[tolower(dta.vmap$varreference) == "metabolite_id"])
    subjid = dta.vmap$cohortvariable[tolower(dta.vmap$varreference) == 'id']
 #   print(paste("metabid",metabid))
 #    print(paste("subjid",subjid))
    outmessage = c()
    if (length(metabid) == 0) {
      outmessage = "Error: metabid is not found as a parameter in VarMap sheet!  Specify which column should be used for metabolite id"
    }
    else if (length(subjid) == 0) {
      outmessage = c(
        outmessage,"Error: id (for subject id) is not found as a parameter in VarMap sheet!  Specify which column should be used for subject id"
      )
    }
    else {
      dta.metab[[metabid]] = tolower(dta.metab[[metabid]])
      dta.sdata[[subjid]] = tolower(dta.sdata[[subjid]])
      dta.smetab[[subjid]] = tolower(dta.smetab[[subjid]])
      if (length(grep(metabid,colnames(dta.metab))) == 0) {
        outmessage = c(
          outmessage,"Error: Metabolite ID from 'VarMap Sheet' (",metabid,") does not match column name from 'Metabolites Sheet'"
        )
      }
      else if (length(grep(subjid,colnames(dta.sdata))) == 0) {
        outmessage = c(
          outmessage,"Error: Sample ID from 'VarMap Sheet' (",subjid,") does not match a column name in 'SubjectData Sheet'"
        )
      }
      else if (length(unique(dta.sdata[,subjid])) != length(unique(dta.smetab[,subjid]))) {
        outmessage = c(
          outmessage,"Warning: Number of subjects in SubjectData sheet does not match number of subjects in SubjectMetabolites sheet"
        )
      }
      else if (length(unique(colnames(dta.smetab))) != ncol(dta.smetab)) {
        outmessage = c(
          outmessage,"Warning: Metabolite abundances sheet (SubjectMetabolites) contains duplicate columns (metabolite names)"
        )
      }
      else if (length(unique(unlist(dta.sdata[,subjid]))) != nrow(dta.sdata)) {
        outmessage = c(
          outmessage,"Warning: Sample Information sheet (SubjectData) contains duplicate ids"
        )
      }
      else if (length(unique(unlist(dta.metab[,metabid]))) != nrow(dta.metab)) {
        outmessage = c(
          outmessage,"Warning: Metabolite Information sheet (Metabolites) contains duplicate metabolite ids"
        )
      }
      
      else {
        nummetab = length(unique(colnames(dta.smetab)[-c(which(colnames(dta.smetab) ==
                                                                 subjid))]))
        numsamples = length(unique(dta.smetab[[subjid]]))
        if (length(intersect(as.character(unlist(dta.metab[,metabid])),colnames(dta.smetab)[-c(which(colnames(dta.smetab) ==
                                                                                                     subjid))])) == nummetab &&
            length(intersect(as.character(unlist(dta.sdata[,subjid])),dta.smetab[[subjid]])) ==  
            numsamples) {
          outmessage = c(
            outmessage,"Passsed all integrity checks, analyses can proceed. If you are part of COMETS, please download metabolite list below and submit to the COMETS harmonization group."
          )   
        }
        else {
          if (length(intersect(tolower(dta.metab[[metabid]]),tolower(colnames(dta.smetab)))) !=
              nummetab) {
            outmessage = c(
              outmessage,"Error: Metabolites in SubjectMetabolites DO NOT ALL match metabolite ids in Metabolites Sheet"
            )
          }
          if (length(intersect(dta.sdata[[subjid]],dta.smetab[[subjid]])) !=
              numsamples) {
            outmessage = c(
              outmessage,"Error: Sample ids in SubjectMetabolites DO NOT ALL match subject ids in SubjectData sheet"
            )
          }
        }
      }
    } 
    if (is.null(outmessage)) {
      outmessage = "Input data has passed QC (metabolite and sample names match in all input files)"
    }
    
    return(
      list(
        dta.smetab = dta.smetab,dta.metab = dta.metab, dta.sdata = dta.sdata,outmessage =
          outmessage
      )
    ) 
  }



#################################################################################
#
# Shiny functions          -----------------------------------------------------
#
#################################################################################
shinyServer(function(input, output,session) { # EM added session here to automatically populate dropdown menu
  # Function for individual cohort correlations -------------------------------
  
  
  
#   output$contents <- renderPrint({
#     summary(readData()[[1]])
#   })

  
  
    
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
    
    if (length(inFile)==0)
      return(NULL)
    
    else if (length(grep(".xlsx", input$file1, ignore.case = TRUE)) > 0) {
      xlfile <- input$file1
      
      file.rename(xlfile$datapath,
                paste(xlfile$datapath, ".xlsx", sep=""))
      dta.metab<-fixData(read_excel(paste(xlfile$datapath, ".xlsx", sep=""), 1)) #metabolite meta data
      dta.smetab<-fixData(read_excel(paste(xlfile$datapath, ".xlsx", sep=""), 2)) #subject metabolite data
      dta.sdata<-fixData(read_excel(paste(xlfile$datapath, ".xlsx", sep=""), 3)) #subject data
      dta.vmap<-fixData(read_excel(paste(xlfile$datapath, ".xlsx", sep=""), 4)) #variable mapping
      dta.models<-fixData(read_excel(paste(xlfile$datapath, ".xlsx", sep=""), 5)) #batch model specifications
      }
    
  # convert metabolite_id names to lower case
  #  dta.metab$metabolite_id <- tolower(dta.metab$metabolite_id)
    
    
 
  # Check file integrity:
    ckintegrity=CheckIntegrity(dta.metab=dta.metab,dta.smetab=dta.smetab, 
                               dta.sdata=dta.sdata,dta.vmap=dta.vmap) 
    integritymessage=ckintegrity$outmessage
    dta.metab=ckintegrity$dta.metab
    dta.smetab=ckintegrity$dta.smetab
    dta.sdata=ckintegrity$dta.sdata
    #print("Printing Integrity Message:")
    #print(integritymessage)

# If an error was found during integrity check (e.g. not all metabolites or subjects in the SubjectMetabolite sheet are annotated in the respective metadatasheets Subjects and Metabolites), then return only integrity check
    if (length(grep("Error", ckintegrity$outmessage))>0) {
	       dtalist=list(integritymessage=integritymessage,mods=dta.models) }
    else {
      dta <- inner_join(dta.sdata, dta.smetab)

      idvar<-dta.vmap$cohortvariable[dta.vmap$varreference == 'id']
      metabvar<-tolower(dta.vmap$cohortvariable[dta.vmap$varreference == "metabolite_id"])
      
            
     #rename variables if batch mode so we can run models 
    if (input$modelspec == 'Batch') {
      # take only vars that are named differently for the cohort
      tst<-dplyr::filter(dta.vmap,!is.na(cohortvariable) & varreference != "metabolite_id")
      
      newnames <- mapvalues(names(dta),
                            from = c(tolower(tst$cohortvariable)),
                            to = c(tolower(tst$varreference)))
      
      names(dta) <- newnames
      
      newnames <- mapvalues(names(dta),
                            from = c(tolower(tst$cohortvariable)),
                            to = c(tolower(tst$varreference)))
      
      names(dta) <- newnames
      
#       #rename cohort metabid to metabolite id
#       names(dta.metab)<-mapvalues(names(dta.metab),from=metabvar,to="metabolite_id")
    }
  
    #put metabolite list in lower case    
   # dta.metab$metabolite_id<-tolower(dta.metab$metabolite_id)
    
    # run through all vmap specifications to create variables
    
    # Create list for output
    # 1 = subj data - subjdata (metabolite abundances)
    # 2 = metabolite var list - allMetabolites
    # 3 = subjectID variable subjId
    # 4 = metabolite metadata
    # 5 = models
    dtalist <- list(
      subjdata = dta,
      allMetabolites = names(dta.smetab)[-1],
      allSubjectMetaData = names(dta.sdata)[-1],
      allSubjects = dta.sdata[,idvar],
      subjId = idvar,
      metabId = metabvar,
      metab = dta.metab,
      mods = dta.models,
      integritymessage=integritymessage
    )
#    print(paste("end of readdata",Sys.time()))
    } # end else integritycheck doesn't contain error

     # harmonize dtalist metabolite IDs with COMETS' uid.csv
     #harmdtalist=Harmonize(dtalist)

     # Get filtering parameters for metabolites (variance, # missing values)
     
    return(dtalist)
  })
  
  
  
  
  
  #----------------------------------------------------------------
  # establish working data
  #----------------------------------------------------------------
  getData <- reactive({
    if (dobug)
      prdebug("Start getdata:",NULL)
    if (length(input$modelspec)==0)
      return(NULL)
    
    if (input$modelspec == "Interactive") {
      # adjust the variable names
      # found all metabolites
      if (!is.na(match("All metabolites",input$rowvars)))
        rcovs <-
          unique(c(input$rowvars[input$rowvars != "All metabolites"],c(readData()[[2]])))
      else
        rcovs <- input$rowvars
      
      
      if (!is.na(match("All metabolites",input$colvars)))
        ccovs <-
          unique(c(input$colvars[input$colvars != "All metabolites"],c(readData()[[2]])))
      else
        ccovs <- input$colvars
      
      acovs <- input$adjvars
    }
    else if (input$modelspec == "Batch") {
      # here we need to get the covariates defined from the excel sheet
      # step 1. get the chosen model first
      
      
      mods<-dplyr::filter(as.data.frame(readData()[["mods"]]),model==input$modbatch)
        if (length(mods)>0 & mods$outcomes=="All metabolites")
          rcovs<-c(readData()[[2]])
        else 
          rcovs<-as.vector(strsplit(mods$outcomes," ")[[1]])
        
        if (length(mods)>0 & mods$exposure=="All metabolites")
          ccovs<-c(readData()[[2]])
        else 
          ccovs<-as.vector(strsplit(mods$exposure," ")[[1]])
        
        if (!is.na(mods$adjustment))
          acovs<-as.vector(strsplit(mods$adjustment," ")[[1]])
        else acovs<-NULL
        
      
        
      
      
    }
    
    if (dobug)
      prdebug("Set up columvars:",input$modelspec)
    # merge smetab
    if (length(acovs) == 0){
      gdta <-
        subset(as.data.frame(readData()[[1]]),select = c(ccovs,rcovs))
    }
    else {
      gdta <-
        subset(as.data.frame(readData()[[1]]),select = c(acovs,ccovs,rcovs))
    }
    
    # list for subset data
    # 1: subset data: gdta
    # 2: column variables: ccovs
    # 3: row variables: rcovs
    if (dobug)
      prdebug("End of getdata:",dim(gdta))
    list(gdta = gdta,ccovs = ccovs,rcovs = rcovs,acovs=acovs)
    
  })
  
  
  
  
  
  
  #----------------------------------------------------------------
  # save as Csv file
  #----------------------------------------------------------------
  output$downloadData <- downloadHandler(
    
    filename = function() {

      
      fname = gsub('.','_',tolower(input$cohort), fixed = TRUE)
      paste(fname,'corr',Sys.Date(),'.csv',sep = '')
    },
    content = function(file) {
      write.csv(getCorr(), file)
    }
  )
  
  
  output$heatPlot <-  renderPlotly({
    validate(
      need(length(input$file1)>0, " ")
    )
    
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
    ccorrmat <- ccorrmat[order(ccorrmat$metabolite_name), ]
    gather(ccorrmat,"covariate","corr",1:length(getData()[[2]]))%>%
    plot_ly(z = corr,
            x = covariate, y = metabolite_name,
            type = "heatmap",
            colorbar = list(title = "Correlation")) %>%
      layout(p,
             margin = list(l = 200),     
        title = " ",      # layout's title: /r/reference/#layout-title
        xaxis = list(           # layout's xaxis is a named list. 
          title = " ",       # xaxis's title: /r/reference/#layout-xaxis-title
          showgrid = F          # xaxis's showgrid: /r/reference/#layout-xaxis
        ),
        yaxis = list(           # layout's yaxis is a named list. 
          title = " "        # yaxis's title: /r/reference/#layout-yaxis-title
        )
        ,
        legend = list(           # layout's yaxis is a named list. 
          title = "Correlation"        # yaxis's title: /r/reference/#layout-yaxis-title
        ))

#    dtaView
  })
  
  output$networkPlot <- renderPlot({
    validate(
      need(length(input$file1)>0, "Please input Excel file on the left panel.")
    )
    
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
   

#######################
# Output integrity check message (Integrity Check) (EM)
######################
output$IntegrityMessage <- renderUI({
	validate(
	  need(!is.null(readData()), "Please input Excel file on the left panel")
	)
  mydat=readData()
  return(HTML(paste("<div class='rcorners1'>",mydat$integritymessage,"</div>")))
# 	if(is.null(mydat)) {
# 		"Please input Excel file on the left panel"
# 	}
#         else {readData()$integritymessage}
})



#######################
# Output integrity check message (Integrity Check) (EM)
######################
output$CorrelateMessage <- renderUI({
  validate(
    need(!is.null(readData()), "Please input Excel file on the left panel")
  )
  return(HTML(paste("<div class='rcorners1'>Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.</div>")))
  # 	if(is.null(mydat)) {
  # 		"Please input Excel file on the left panel"
  # 	}
  #         else {readData()$integritymessage}
})


#######################
# Output # subjects, # metabolites from input Excell sheet (Integrity Check) (EM)
#######################
output$InputFilesStats <- renderTable({
  validate(
    need(!is.null(readData()), " ")
  )
  resdf<-data.frame(Num_Metabolites_Sheet1=paste(length(readData()$metab[[readData()$metabId]]),"metabolites"),
                    Num_Samples2_Sheet3=paste(length(readData()$allSubjects[[readData()$subjId]]),"subjects"),     
                    Size_Data_Sheet2=paste(nrow(readData()$subjdata)," subjects with ",
                                           ncol(readData()$subjdata)-length(readData()$allSubjectMetaData)-1,
                                           " metabolites",sep=""))
  colnames(resdf)<-c("Metabolites sheet","Subject data sheet","Subject metabolites sheet")
           return(resdf)
#         }  
}, 
caption="Input Data Summary",
caption.placement = getOption("xtable.caption.placement", "top"),
include.rownames = FALSE
)

#######################
# Output number of harmonized/non-harmonized metabolites (Integrity Check) (EM)
#######################
output$HarmStats <- renderTable({
  validate(
    need(!is.null(readData()), " ")
  )
  
# 	mylist=readData()
# 	if (is.null(mylist)) {return(NULL)}
# 	else {
	mylistharm=Harmonize(readData())
	mydat=GetMetabStats(mylistharm)
# 	if (is.null(mydat$subjdata))
#              return(data.frame(Status="Nothing To Report; Check error above"))
#         else {
	   nummets=nrow(mydat$metab)
	   resdf<-data.frame(Total_Metabolites_ForAnalysis=nummets, 
	                     Total_Harmonized=length(which(!is.na(mydat$metab$UID_01))),
	                     Total_NonHarmonized=length(which(is.na(mydat$metab$UID_01))))
	   colnames(resdf)<-c("N Metabolites","N Harmonized","N Non-Harmonized")
	   return(resdf)
# 	}
# 	}
}, 
caption="Harmonization Summary",
caption.placement = getOption("xtable.caption.placement", "top"),
include.rownames = FALSE
)


#######################
# Output plots that summarize variance and number of missing values (Integrity Check) (EM)
#######################
output$MetabForAnalysisStats <- renderPlot({
  output$plotDone <<- renderUI({tags$input(type="hidden", value="TRUE")})
  
	mylist=readData()
        if (is.null(mylist)) {return(NULL)}
	else {
        mylistharm=Harmonize(mylist)
        mydat=GetMetabStats(mylistharm)
	if (is.null(mydat$subjdata))
             return(NULL)
	else {
		par(mfrow=c(1,2))
		hist(mydat$metab$log2var,main="Log2 Variance Distribution",breaks=200,xlab="log2 Variance")
		hist(mydat$metab$nummissing,main="Missing Values",breaks=200,xlab="Number of missing values")
	}
	}
})

#######################
# Download list of harmonized metabolites (Integriy Check) (EM)
#######################
output$downloadharmmetab <- downloadHandler(
        filename=paste0(input$cohort,Sys.Date(),"Harmonization.csv"),
        content=function(file){
                mylist=readData()
                mydat=Harmonize(mylist)
                if (is.null(mydat$metab))
                        return(NULL)
                else {
                write.csv(mydat$metab,quote=F,row.names=F,file=file)
                }
        }
)



  # G
  getCorr <- reactive({
    
    
    validate(
      need(!is.null(getData()), " ")
    )
    
    
    # get correlation matrix
    col.rcovar <- match(getData()[[3]],names(getData()[[1]]))
    
    # column indices of column covariates
    col.ccovar <- match(getData()[[2]],names(getData()[[1]]))
    
    
    # column indices of adj-var
    col.adj <- match(getData()[[4]],names(getData()[[1]]))
    

    
    if (length(col.adj)==0) {
      print("running unadjusted")
      data<-getData()[[1]][,c(col.rcovar,col.ccovar)]
      # calculate unadjusted spearman correlation matrix
#       names(data)<-paste0("v",1:length(names(data)))
      if (dobug)
        prdebug("start corr",length(getData()))
      corr<-cor(data,method = "spearman")
      if (dobug)
        prdebug("end corr",NULL)
      corr <- data.frame(corr[1:length(col.rcovar),-(1:length(col.rcovar))])

      # calculate complete cases matrix
      n  <-
        matrix(NA,nrow = length(col.rcovar),ncol = length(col.ccovar))
      for (i in 1:length(col.rcovar)) {
        for (j in 1:length(col.ccovar)) {
          n[i,j] <- sum(complete.cases(data[,c(col.rcovar[i],col.ccovar[j])]))
        }
      }
    }
    else {
      # calculate partial correlation matrix
      print("running adjusted")
#      corr <-
#        pcor.test(data[,col.rcovar],data[,col.ccovar], data[,col.adj],method="spearman")
      dtarank<-as.data.frame(apply(getData()[[1]],2,rank))
      
      #filter columns with 0 variance
      # take out indices with - variance
      #which(apply(dtarank,2,var)==0,arr.ind = T)
      
      
      corr <-partial.r(dtarank,c(col.rcovar,col.ccovar),col.adj)
      corr<-as.data.frame(corr[1:length(col.rcovar),-(1:length(col.rcovar))])
      #corr <-corr.p(data,c(col.rcovar,col.ccovar), col.adj,method="spearman")
      #corr<-corr$estimate[1:length(col.rcovar),-(1:length(col.rcovar))]
      # calculate complete cases matrix
      n  <-
        matrix(NA,nrow = length(col.rcovar),ncol = length(col.ccovar))
      n  <-
        matrix(NA,nrow = length(col.rcovar),ncol = length(col.ccovar))
      for (i in 1:length(col.rcovar)) {
        for (j in 1:length(col.ccovar)) {
          n[i,j] <- sum(complete.cases(dtarank[,c(col.rcovar[i],col.ccovar[j],col.adj)]))
        }
      }
      
      
    }
    colnames(corr) <- as.character(getData()[[2]])
#     rownames(corr) <- as.character(getData()[[3]])
    colnames(n) <- paste(as.character(getData()[[2]]),".n",sep = "")
    ttval<-sqrt(n-length(col.adj)-2)*corr/sqrt(1-corr**2)
    pval<-sapply(abs(ttval),pt,df=tn-length(col.adj)-2,lower.tail=FALSE)*2
    colnames(pval) <- paste(as.character(getData()[[2]]),".p",sep = "")
    

    # combine the two matrices together as data frame
    corr <- fixData(data.frame(round(corr,digits=3),
                       n,
                       pval,
                       metabolite_id=rownames(corr),
                       model=ifelse(input$modelspec=='Interactive',input$model,input$modbatch),
                       cohort=input$cohort,
                       adjvars=ifelse(length(col.adj)==0,"None",paste(getData()[[4]],collapse = " "))))
    


    ccorrmat <- dplyr::select(inner_join(corr,Harmonize(readData())$metab,by=c("metabolite_id"=readData()$metabId)),-metabolite_id)

    ccorrmat
  })
  
  
  
  
  # Render heatmap of correlations-------------------------
  
  # ccorrmat$metabolite <- with(ccorrmat, reorder(metabolite,input$sortby))
#   testcorg <- reactive({
#     gather(getCorr(),"covariate","corr",1:length(input$xvars))
#     
#     testcorg %>%
#       ggvis( ~ covariate, ~ metabolite,fill =  ~ corr) %>%
#       layer_rects(width = band(), height = band()) %>%
#       layer_text(
#         x = prop("x", ~ covariate, scale = "xcenter"),
#         y = prop("y", ~ metabolite, scale = "ycenter")
#         #  text: =  ~ Freq, fontSize: = 20, fill: = "white", baseline: =
#         #    "middle", align: = "center"
#       ) %>%
#       scale_nominal("x", padding = 0, points = FALSE) %>%
#       scale_nominal("y", padding = 0, points = FALSE) %>%
#       scale_nominal("x", name = "xcenter", padding = 1, points = TRUE) %>%
#       scale_nominal("y", name = "ycenter", padding = 1, points = TRUE) %>%
#       bindshiny("ggvis")
#     
#   })
  
  
  # Choose sorting option --------------------------------------
  output$selectSort <- renderUI({
    validate(
      need(length(input$file1)>0, "Please input Excel file on the left panel")
    )
    
    
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
    validate(
      need(length(input$file1)>0, " ")
    )
    
    
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
    
    
    modchoices<-as.data.frame(readData()[["mods"]])
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
    
    
    if (length(labs)==0) {
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
      return("Waiting for input")
    
    if (length(getCorr())==0)
      return(NULL)
    
    #tabulate findings, those with biochemical = NA did not find a match
    dplyr::select(getCorr(),-cohort_platform,-cohort_other,-multrows)
  })
  
  output$cheatmap <- renderD3heatmap({
    validate(
      need(length(input$file1)>0, "Please input Excel file on the left panel.")
    )
    
    validate(
      need(length(getData()[[2]])>1, "Requires 2 or more exposure variables.")
    )
    corr<-getCorr()
    rownames(corr)<-corr$metabolite_name
    ncols<-length(getData()[[2]])
    d3heatmap(
      corr[,1:ncols],
      colors = input$palette,
      dendrogram = if (input$cluster) "both" else "none"
    )
  })

  
  #----------------------------------------------------------------
  # pass integrity checks
  #----------------------------------------------------------------
  observe({
    if (length(input$file1)==0){
      shinyjs::hide("advanced")
      return(NULL)
      
    }
    tst<-readData()$integritymessage
    
    if (grepl('Error',readData()$integritymessage)==FALSE) {
      shinyjs::show("advanced")
    }
  })
  
  
  #----------------------------------------------------------------
  # pass integrity checks
  #----------------------------------------------------------------
  observe({
    if (length(input$file1)==0){
      shinyjs::hide("advcorr")
      return(NULL)
    }
    else    
      shinyjs::show("advcorr")
  })
  
})
