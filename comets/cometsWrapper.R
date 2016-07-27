library(stringr)
library(jsonlite)
library(COMETS)

checkIntegrity <- function(filename) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                readCOMETSinput(filename),
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
                    #COMETS:::makeOutputCSV("corr",excorrdata,input$cohortSelection)
                    list(
                      excorrdata = excorrdata,
                      exposures = exmodeldata$ccovs,
                      model = input$modelName,
                      status = TRUE,
                      statusMessage = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis."
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
