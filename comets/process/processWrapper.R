library(stringr)
library(jsonlite)
library(COMETS)
library(stats)

runAllModels <- function(jsonData) {
    integrityCheck <- list()
    suppressWarnings(suppressMessages({
      tryCatch(
        withCallingHandlers(
          {
            input = fromJSON(jsonData)
            input$timestamp = as.integer(Sys.time())
            exmetabdata <- readCOMETSinput(paste0(input$filename))
          },
          message=function(m) {
            print(m$message)
          },
          warning=function(w) {
            integrityCheck$warnings <<- append(integrityCheck$warnings, w$message)
          }
        ),
        error=function(e) {
          integrityCheck$error <<- e$message
          return(NULL)
        }
      )
    }))
    if ('error' %in% names(integrityCheck)) {
      return(toJSON(list(integrityCheck=integrityCheck,models=list(),timestamp=input$timestamp), auto_unbox = T))
    }
    returnValue <- list()
    for (model in exmetabdata$mods$model) {
      returnValue[[model]] = runModel(input,exmetabdata,model)
    }
    toJSON(list(integrityCheck=integrityCheck,models=returnValue,timestamp=input$timestamp), auto_unbox = T)
}

runModel <- function(input,exmetabdata,model) {
  returnValue <- list()
  suppressWarnings(suppressMessages({
    returnValue$saveValue <- tryCatch(
      withCallingHandlers(
        {
          exmodeldata <- getModelData(exmetabdata,
            modelspec="Batch",
            modlabel=model
          )
          if (length(exmodeldata$scovs) > 0) {
            excorrdata <- stratCorr(exmodeldata,exmetabdata,input$cohortSelection)
          } else {
            excorrdata <- getCorr(exmodeldata,exmetabdata,input$cohortSelection)
          }
          csv <- OutputCSVResults(paste0('tmp/',model,input$timestamp),excorrdata,input$cohortSelection)
        },
        message=function(m) {
            print(m$message)
        },
        warning=function(w) {
            returnValue$warnings <<- append(returnValue$warnings, w$message)
        }
      ),
      error=function(e) {
          returnValue$error <<- e$message
          return(NULL)
      }
    )
  }))
  returnValue
}
