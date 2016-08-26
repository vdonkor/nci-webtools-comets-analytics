library(stringr)
library(jsonlite)
library(COMETS)
library(stats)

checkIntegrity <- function(filename) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                  exmetabdata = readCOMETSinput(filename)
                  exmetabdata$csvDownload = OutputCSVResults(paste0('tmp/Harm',as.integer(Sys.time())),exmetabdata$metab,'')
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
                    clustersort = NULL
                    if (length(exmodeldata$ccovs) > 1) {
                      heatmapdata <- tidyr::spread(dplyr::select(excorrdata,metabolite_name,exposure,corr),exposure,corr)
                      rownames(heatmapdata) <- heatmapdata[,1]
                      heatmapdata <- heatmapdata[,2:ncol(heatmapdata)]
                      heatmapdata <- as.matrix(heatmapdata)
                      rowDendrogram = rev(reorder(as.dendrogram(hclust(dist(heatmapdata))), rowMeans(heatmapdata,na.rm=TRUE)))
                      colDendrogram <- rev(reorder(as.dendrogram(hclust(dist(t(heatmapdata)))), colMeans(heatmapdata,na.rm=TRUE)))
                      heatmapdata <- heatmapdata[order.dendrogram(rowDendrogram),order.dendrogram(colDendrogram)]
                      clustersort = list(
                        col=names(as.data.frame(heatmapdata)),
                        colTree=makeBranches(colDendrogram),
                        row=rownames(heatmapdata),
                        rowTree=makeBranches(rowDendrogram)
                      )
                    }
                    list(
                      clustersort = clustersort,
                      csv = csv,
                      excorrdata = excorrdata,
                      exposures = exmodeldata$ccovs,
                      model = input$modelName,
                      status = TRUE,
                      statusMessage = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.",
                      tableOrder = names(excorrdata)
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
    toJSON(returnValue, auto_unbox = T)
}

makeBranches <- function(dendrogram) {
  root <- list(
    label = attributes(dendrogram)["label"]$label
  )
  if (!is.leaf(dendrogram)) {
    root$branch <- lapply(dendrogram, makeBranches)
  }
  root
}
