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
  warnings <- c()
  suppressWarnings(suppressMessages({
    returnValue <- tryCatch(
      withCallingHandlers(
        {
          exmodeldata <- getModelData(exmetabdata,
            modelspec="Batch",
            modlabel=model
          )
          excorrdata <- runCorr(exmodeldata,exmetabdata,input$cohortSelection)
          csv <- OutputCSVResults(paste0('tmp/',model,input$timestamp),excorrdata,input$cohortSelection)
          list(saveValue=csv,ptime=attr(excorrdata,"ptime"))
        },
        message=function(m) {
            print(m$message)
        },
        warning=function(w) {
            warnings <<- append(warnings, w$message)
        }
      ),
      error=function(e) {
          returnValue$error <<- e$message
          return(NULL)
      }
    )
  }))
  returnValue$warnings <- warnings
  return(returnValue)
}
