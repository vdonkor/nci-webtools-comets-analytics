library(COMETS)
library(jsonlite)
library(openxlsx)
library(stats)
library(stringr)


getTimestamp <- function() {
  format(Sys.time(), "%Y-%m-%d %T")
}

logMessage <- function(message) {
  cat(sprintf("[%s] %s\n", getTimestamp(), message))
}

runAllModels <- function(jsonData) {
    integrityCheck <- list()
    warnings <- c()
    logMessage("Running integrity check")
    suppressWarnings(suppressMessages({
      integrityCheck <- tryCatch(
        withCallingHandlers(
          {
            input = fromJSON(jsonData)
            input$timestamp = as.integer(Sys.time())
            exmetabdata <- readCOMETSinput(paste0(input$filename))
            list(csv=OutputCSVResults(paste0('tmp/Harmonization',input$timestamp),exmetabdata$metab,input$cohortSelection))
          },
          message=function(m) {
            print(m$message)
          },
          warning=function(w) {
            warnings <<- append(warnings, w$message)
          }
        ),
        error=function(e) {
          integrityCheck$error <<- e$message
          return(NULL)
        }
      )
    }))
    integrityCheck$warnings <- unique(warnings)
    if ('error' %in% names(integrityCheck)) {
      logMessage("Found errors during integrity check")
      return(toJSON(list(integrityCheck=integrityCheck,models=list(),timestamp=input$timestamp), auto_unbox = T))
    }
    copyName = str_replace(input$filename,"([\\/])[^.]+(.+)$",paste0("\\1inputs_",input$timestamp,"\\2"))

    logMessage(paste("Removing unused sheets from:", input$filename))
    wb = loadWorkbook(input$filename)
    for (sheet in names(wb)[!is.element(names(wb),c("Metabolites","VarMap","Models"))]) {
      removeWorksheet(wb,sheet=sheet)
    }
    saveWorkbook(wb,copyName,overwrite=TRUE)

    logMessage("Getting descriptive data for models: runDescrip(exmetabdata)")
    descdata <- runDescrip(exmetabdata)
    descrcsv <- OutputXLSResults(filename="tmp/descr",datal=descdata,cohort=input$cohortSelection)
    logMessage(paste("Wrote descriptive data to:", descrcsv))

    returnValue <- list()
    for (model in exmetabdata$mods$model) {
      logMessage(paste("\nRunning model:", model))
      returnModel <- runModel(input,exmetabdata,model)
      returnModel$modelName <- model
      returnModel$warnings <- unique(returnModel$warnings)
      returnValue[[length(returnValue)+1]] <- returnModel
    }
    toJSON(list(descrcsv=descrcsv,inputs=copyName,integrityCheck=integrityCheck,models=returnValue,timestamp=input$timestamp), auto_unbox = T)
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
