library(stringr)
library(jsonlite)
library(COMETS)
library(stats)

getCohorts <- function() {
    dir <- system.file("extdata", package="COMETS", mustWork=TRUE)
    masterfile <- file.path(dir, "compileduids.RData")
    load(masterfile)
    toJSON(as.list(cohorts)$Cohort, auto_unbox = T)
}

getTemplates <- function() {
    dir <- system.file("extdata", package="COMETS", mustWork=TRUE)
    ageData = paste0(readxl::read_excel(file.path(dir,"cometsInputAge.xlsx"),4)$VARREFERENCE,collapse=",")
    basicData = paste0(readxl::read_excel(file.path(dir,"cometsInputBasic.xlsx"),4)$VARREFERENCE,collapse=",")
    templateData = data.frame(text=c("Age","Basic"),value=c('age','basic'),data=c(ageData,basicData))
    toJSON(templateData)
}

combineInputs <- function(jsonData) {
  suppressWarnings(suppressMessages({
    returnValue <- list()
    returnValue$saveValue <- tryCatch(
      withCallingHandlers(
        {
          input = fromJSON(jsonData)
          filename = paste0("tmp/combinedInput",as.integer(Sys.time()),".xlsx")
          COMETS::createCOMETSinput(
            template=input$templateSelection,
            filenames=list(
                metabfile=input$metadata,
                subjfile=input$sample,
                abundancesfiles=input$abundances
            ),
            varmap=input,
            outputfile=filename
          )
          list(downloadLink=filename)
        },
        message=function(m) {
          print(m$message)
        },
        warning=function(w) {
          returnValue$warnings <<- append(returnValue$warnings, w$message)
        }
      ),
      error=function(e) {
        returnValue$error <<- list(
          status = FALSE,
          statusMessage = e$message
        )
        return(NULL)
      }
    )
  }))
  toJSON(returnValue, auto_unbox = T)
}

checkIntegrity <- function(filename,cohort) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                  exmetabdata = readCOMETSinput(filename)
                  exmetabdata$csvDownload = OutputCSVResults(paste0('tmp/Harm',as.integer(Sys.time())),exmetabdata$metab,cohort)
                  #lookup = exmetabdata$metab[c('metabid','biochemical')]
                  #names(lookup) <- c('joint','new')
                  #replaceWith <- as.data.frame(replaceList(lookup,exmetabdata$allMetabolites))
                  #replaceWith[,2] <- exmetabdata$allMetabolites
                  #names(replaceWith) <- c("text","value")
                  #exmetabdata$allMetabolites <- replaceWith
                  exmetabdata
                },
                message=function(m) {
                    print(m$message)
                },
                warning=function(w) {
                    returnValue$warnings <<- append(returnValue$warnings, w$message)
                }
            ),
            error=function(e) {
                returnValue$error <<- list(
                    status = FALSE,
                    integritymessage = e$message
                )
                return(NULL)
            }
        )
    }))
    toJSON(returnValue, auto_unbox = T)
}

runModel <- function(jsonData) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                    input = fromJSON(jsonData)
                    exmetabdata <- readCOMETSinput(input$filename)
                    exmodeldata <- getModelData(exmetabdata,modelspec=input$methodSelection,modbatch=input$modelSelection,rowvars=input$outcome,colvars=input$exposure,adjvars=input$covariates)
                    excorrdata <- getCorr(exmodeldata,exmetabdata,input$cohortSelection)
                    csv <- OutputCSVResults(paste0('tmp/corr',as.integer(Sys.time())),excorrdata,input$cohortSelection)
                    heatmapdata = excorrdata[!is.na(excorrdata$pvalue),]
                    clustersort = NULL
                    if (length(unique(heatmapdata$outcomespec)) > 1 && length(unique(heatmapdata$exposurespec)) > 1) {
                      heatmapdata <- tidyr::spread(dplyr::select(heatmapdata,outcomespec,exposurespec,corr),exposurespec,corr)
                      rownames(heatmapdata) <- heatmapdata[,1]
                      heatmapdata <- heatmapdata[,2:ncol(heatmapdata)]
                      heatmapdata <- as.matrix(heatmapdata)
                      rowDendrogram = rev(reorder(as.dendrogram(hclust(dist(heatmapdata))), rowMeans(heatmapdata,na.rm=TRUE)))
                      colDendrogram <- rev(reorder(as.dendrogram(hclust(dist(t(heatmapdata)))), colMeans(heatmapdata,na.rm=TRUE)))
                      heatmapdata <- heatmapdata[order.dendrogram(rowDendrogram),order.dendrogram(colDendrogram)]
                      exposureLookup <- excorrdata[!duplicated(excorrdata[,'exposurespec']),c('exposure','exposurespec')]
                      exposureLookup <- exposureLookup[exposureLookup$exposurespec %in% colnames(heatmapdata),]
                      exposureLookup <- exposureLookup[order(exposureLookup[,'exposurespec']),]
                      exposureLookup$heatmaporder <- order(colnames(heatmapdata))
                      outcomeLookup <- excorrdata[!duplicated(excorrdata[,'outcomespec']),c('outcome','outcomespec')]
                      outcomeLookup <- outcomeLookup[outcomeLookup$outcomespec %in% rownames(heatmapdata),]
                      outcomeLookup <- outcomeLookup[order(outcomeLookup[,'outcomespec']),]
                      outcomeLookup$heatmaporder <- order(rownames(heatmapdata))
                      clustersort = list(
                        col=exposureLookup[order(exposureLookup$heatmaporder),'exposure'],
                        colTree=makeBranches(colDendrogram,exposureLookup),
                        row=outcomeLookup[order(outcomeLookup$heatmaporder),'outcome'],
                        rowTree=makeBranches(rowDendrogram,outcomeLookup)
                      )
                    }
                    excorrdata[,'pvalue'] <- with(excorrdata,format(pvalue, scientific=TRUE,digits=I(3)))
                    list(
                      clustersort = clustersort,
                      csv = csv,
                      excorrdata = excorrdata,
                      exposures = excorrdata[!duplicated(excorrdata[,'exposure']),'exposure'],
                      model = input$modelName,
                      ptime = attr(excorrdata,"ptime"),
                      status = TRUE,
                      statusMessage = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.",
                      tableOrder = exmetabdata$dispvars
                    )
                },
                message=function(m) {
                    print(m$message)
                },
                warning=function(w) {
                    returnValue$warnings <<- append(returnValue$warnings, w$message)
                }
            ),
            error=function(e) {
                returnValue$error <<- list(
                    status = FALSE,
                    statusMessage = e$message
                )
                return(NULL)
            }
        )
    }))
    toJSON(returnValue, auto_unbox = T, digits = I(3))
}

makeBranches <- function(dendrogram,lookup) {
  root <- list(
    label = lookup[lookup[,2] == attributes(dendrogram)["label"]$label,1]
  )
  if (!is.leaf(dendrogram)) {
    root$branch <- lapply(dendrogram, makeBranches,lookup)
  }
  root
}

replaceList = function(frame,old) {
  if (length(old) < 1) return(old)
  names(frame) <- c('joint','new')
  new = as.data.frame(old)
  names(new) <- 'joint'
  new$order = 1:nrow(new)
  new = merge(frame,new,by='joint')
  new = new[order(new$order),]['new'][[1]]
  return(new)
}
