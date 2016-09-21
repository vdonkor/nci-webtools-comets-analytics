library(stringr)
library(jsonlite)
library(COMETS)
library(stats)

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
                    #lookup = exmetabdata$metab[c('metabid','biochemical')]
                    #names(lookup) <- c('joint','new')
                    #lapply(exmetabdata$allSubjectMetaData,function(toAdd) { lookup[nrow(lookup)+1,] <<- c(toAdd,toAdd) })
                    #excorrdata$metabolite_name <- replaceList(lookup,excorrdata$metabolite_name)
                    #excorrdata$exposure <- replaceList(lookup,excorrdata$exposure)
                    #excorrdata$adjvars = unname(sapply(excorrdata$adjvars,function(a) { paste(replaceList(lookup,strsplit(a,' ')),collapse=' ') }))
                    clustersort = NULL
                    if (length(exmodeldata$ccovs) > 1 && length(exmodeldata$rcovs) > 1) {
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
                    excorrdata[,'pvalue'] <- sapply(excorrdata[,'pvalue'],function(value) { format(value, scientific=TRUE,digits=I(3))})
                    list(
                      clustersort = clustersort,
                      csv = csv,
                      excorrdata = excorrdata,
                      exposures = exmodeldata$ccovs, #replaceList(lookup,exmodeldata$ccovs),
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
    toJSON(returnValue, auto_unbox = T, digits = I(3))
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