library(stringr)
library(jsonlite)
library(CometsAnalyticsPackage)

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
                    if (input$method == "batch") {
                        model = subset(exmetabdata$mods,model==input$model)
                        if (is.na(model$outcomes)) {
                            input$outcomes = "All metabolites"
                        } else {
                            input$outcomes = model$outcomes
                        }
                        if (is.na(model$exposure)) {
                            input$exposures = "age"
                        } else {
                            input$exposures = model$exposure
                        }
                        if (is.na(model$adjustment)) {
                            input$covariates = NULL
                        } else {
                            input$covariates = model$adjustment
                        }
                    }
                    exmodeldata <- getModelData(exmetabdata,rowvars=input$outcomes,colvars=input$exposures,adjvars=input$covariates)
                    excorrdata <- getCorr(exmodeldata,exmetabdata,input$cohort)
                    CometsAnalyticsPackage:::makeOutputCSV("corr",excorrdata,input$cohort)
                    list(
                      excorrdata = excorrdata,
                      exposures = exmodeldata$ccovs,
                      model = input$model,
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
