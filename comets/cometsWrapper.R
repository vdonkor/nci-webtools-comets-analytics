library(stringr)
library(jsonlite)
library(COMETS)

checkIntegrity <- function(filename) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                  exmetabdata = readCOMETSinput(filename)
                  exmetabdata$csvDownload = OutputCSVResults(paste0('Harm',as.integer(Sys.time())),exmetabdata$metab,'')
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
                    csv <- OutputCSVResults(paste0('corr',as.integer(Sys.time())),excorrdata,input$cohortSelection)
                    list(
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
