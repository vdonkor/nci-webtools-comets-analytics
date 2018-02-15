library(COMETS)
library(jsonlite)
library(openxlsx)
library(stats)
library(stringr)

runAllModels <- function(jsonData) {
    integrityCheck <- list()
    warnings <- c()
    suppressWarnings(suppressMessages({
      integrityCheck <- tryCatch(
        withCallingHandlers(
          {
            input = fromJSON(jsonData)
            input$timestamp = as.integer(Sys.time())
            exmetabdata <- readCOMETSinput(paste0(input$filename))
            exmetabdata$csv = OutputCSVResults(paste0('tmp/Harmonization',input$timestamp),exmetabdata$metab,input$cohortSelection)
            exmetabdata
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
    integrityCheck$warnings <- unqiue(warnings)
    if ('error' %in% names(integrityCheck)) {
      return(toJSON(list(integrityCheck=integrityCheck,models=list(),timestamp=input$timestamp), auto_unbox = T))
    }
    copyName = str_replace(input$filename,"([\\/])[^.]+(.+)$",paste0("\\1inputs_",input$timestamp,"\\2"))
    file.copy(input$filename,copyName)
    wb = loadWorkbook(copyName)
    for (sheet in names(wb)[!is.element(names(wb),c("Metabolites","VarMap","Models"))]) {
      removeWorksheet(wb,sheet=sheet)
    }
    returnValue <- list()
    for (model in exmetabdata$mods$model) {
      returnModel <- runModel(input,exmetabdata,model)
      returnModel$modelName <- model
      returnModel$warnings <- unique(returnModel$warnings)
      returnValue[[length(returnValue)+1]] <- returnModel
    }
    toJSON(list(inputs=copyName,integrityCheck=integrityCheck,models=returnValue,timestamp=input$timestamp), auto_unbox = T)
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
