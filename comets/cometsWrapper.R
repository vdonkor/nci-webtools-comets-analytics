library(stringr)
library(jsonlite)
# library(COMETS)
library(stats)

getCohorts <- function() {
    dir <- system.file("extdata", package="COMETS", mustWork=TRUE)
    masterfile <- file.path(dir, "compileduids.RData")
    load(masterfile)
    toJSON(as.list(cohorts)$Cohort, auto_unbox = T)
}

getTemplates <- function() {
    dir <- system.file("extdata", package="COMETS", mustWork=TRUE)
    ageData = as.data.frame(readxl::read_excel(file.path(dir,"cometsInputAge.xlsx"),4))
    ageData <- ageData[!is.na(ageData$VARREFERENCE),]
    ageMap = toJSON(ageData$VARREFERENCE, auto_unbox = T)
    rownames(ageData) <- ageData$VARREFERENCE
    ageData = as.data.frame(t(ageData['VARDEFINITION']))
    rownames(ageData) <- NULL
    ageData = toJSON(ageData,auto_unbox=T)
    ageData = substr(ageData,2,nchar(ageData)-1)
    basicData = as.data.frame(readxl::read_excel(file.path(dir,"cometsInputBasic.xlsx"),4))
    basicData <- basicData[!is.na(basicData$VARREFERENCE),]
    basicMap = toJSON(basicData$VARREFERENCE, auto_unbox = T)
    rownames(basicData) <- basicData$VARREFERENCE
    basicData = as.data.frame(t(basicData['VARDEFINITION']))
    rownames(basicData) <- NULL
    basicData = toJSON(basicData,auto_unbox=T)
    basicData = substr(basicData,2,nchar(basicData)-1)
    paste0('[{"text":"Age","value":"age","data":',ageData,',"varlist":',ageMap,'},{"text":"Basic","value":"basic","data":',basicData,',"varlist":',basicMap,'}]')
}

combineInputs <- function(jsonData) {
  timestamp = as.integer(Sys.time())
  suppressWarnings(suppressMessages({
    returnValue <- list()
    returnValue$saveValue <- tryCatch(
      withCallingHandlers(
        {
          input = fromJSON(jsonData)
          filename = paste0("tmp/combinedInput",timestamp,".xlsx")
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
  output = toJSON(returnValue, auto_unbox = T)
  filename = paste0('tmp/chkInt',timestamp,'.out')
  fileConn = file(filename)
  writeLines(output,fileConn)
  close(fileConn)
  filename
}

checkIntegrity <- function(filename,cohort) {
    timestamp = as.integer(Sys.time())
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                  exmetabdata = COMETS::readCOMETSinput(filename)
                  rdsFilePath = paste0('tmp/integrity_check_', timestamp, '.rds')
                  saveRDS(exmetabdata, rdsFilePath)
                  exmetabdata$rdsFilePath = rdsFilePath
                  exmetabdata$stratifiable <- t(as.data.frame(apply(exmetabdata$subjdata[exmetabdata$allSubjectMetaData],2,function(...) { mdCol = table(...); !any(mdCol < 15) })))# && length(as.vector(mdCol)) > 1
                  exmetabdata$csvDownload = COMETS::OutputCSVResults(paste0('tmp/Harm',timestamp),exmetabdata$metab,cohort)
                  subjectMetadata <- as.data.frame(exmetabdata$allSubjectMetaData)
                  subjectMetadata[,1] <- as.character(lapply(
                      exmetabdata$allSubjectMetaData,
                      function(value) {
                          match = value==exmetabdata$vmap$cohortvariable
                          if (any(match)) {
                              return(exmetabdata$vmap$varreference[match])
                          } else {
                              return(value)
                          }
                      }
                  ))
                  subjectMetadata[,2] <- subjectMetadata[,1]
                  names(subjectMetadata) <- c('value','text')
                  colnames(exmetabdata$stratifiable) <- subjectMetadata[,1]
                  exmetabdata$stratifiable <- as.list(as.data.frame(exmetabdata$stratifiable))
                  exmetabdata$allSubjectMetaData <- subjectMetadata
                  exmetabdata
                },
                message=function(m) {
                    print(m$message)
                },
                warning=function(w) {
                    returnValue$warnings <<- unique(append(returnValue$warnings, w$message))
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
    output = toJSON(returnValue, auto_unbox = T)
    filename = paste0('tmp/chkInt',timestamp,'.out')
    fileConn = file(filename)
    writeLines(output,fileConn)
    close(fileConn)
    filename
}

runModel <- function(jsonData) {
    timestamp = as.integer(Sys.time())
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                    input = fromJSON(jsonData)
                    exmetabdata <- readRDS(input$rdsFilePath)
                    exmodeldata <- COMETS::getModelData(exmetabdata,
                      modelspec=input$methodSelection,
                      modlabel=input$modelSelection,
                      rowvars=input$outcome,
                      colvars=input$exposure,
                      adjvars=input$covariates,
                      strvars=input$strata,
                      where=input$whereQuery
                    )
                    excorrdata <- COMETS::runCorr(exmodeldata,exmetabdata,input$cohortSelection)
                    if (length(excorrdata) <= 0) {
                      stop("ModelNotRunException")
                    }
                    csv <- COMETS::OutputCSVResults(paste0('tmp/corr',timestamp),excorrdata,input$cohortSelection)
                    heatmapdata = excorrdata[!is.na(excorrdata$pvalue),]
                    clustersort = NULL
                    if (length(unique(heatmapdata$outcomespec)) > 1 && length(unique(heatmapdata$exposurespec)) > 1 && length(unique(excorrdata$stratavar)) < 1) {
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
                    if (!is.null(excorrdata$corr)) {
                      excorrdata[,'corr'] <- with(excorrdata,format(round(as.numeric(corr),3),scientific=FALSE,digits=I(3)))
                    }
                    if (!is.null(excorrdata$pvalue)) {
                      excorrdata[,'pvalue'] <- with(excorrdata,format(as.numeric(pvalue),scientific=TRUE,digits=I(3)))
                    }
                    if(any(names(excorrdata) == "stratavar")) {
                      strataVector <- excorrdata[!duplicated(excorrdata[,'stratavar']),'stratavar']
                      strataFrame <- as.data.frame(strataVector)
                      strataFrame[,2] <- strataFrame[]
                      names(strataFrame) <- c('value','text')
                    } else {
                      strataFrame <- list()
                    }
                    list(
                      clustersort = clustersort,
                      csv = csv,
                      excorrdata = excorrdata,
                      exposures = excorrdata[!duplicated(excorrdata[,'exposure']),'exposure'],
                      model = input$modelName,
                      ptime = attr(excorrdata,"ptime"),
                      status = TRUE,
                      statusMessage = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.",
                      strata = strataFrame,
                      tableOrder = intersect(exmetabdata$dispvars,names(excorrdata))
                    )
                },
                message=function(m) {
                    print(m$message)
                },
                warning=function(w) {
                    returnValue$warnings <<- unique(append(returnValue$warnings, w$message))
                }
            ),
            error=function(e) {
                message <- e$message
                if (message == "ModelNotRunException") {
                  message <- "The results contain no correlation data."
                }
                returnValue$error <<- list(
                    status = FALSE,
                    statusMessage = message
                )
                return(NULL)
            }
        )
    }))
    output = toJSON(returnValue, auto_unbox = T)
    filename = paste0('tmp/runMdl',timestamp,'.out')
    fileConn = file(filename)
    writeLines(output,fileConn)
    close(fileConn)
    filename
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
