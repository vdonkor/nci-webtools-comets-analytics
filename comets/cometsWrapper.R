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
                returnValue$error <<- e$message
                return(NULL)
            }
        )
    }))
    toJSON(returnValue, auto_unbox = T)
}

runModel <- function(filename) {
    suppressWarnings(suppressMessages({
        returnValue <- list()
        returnValue$saveValue <- tryCatch(
            withCallingHandlers(
                {
                    exmetabdata <- readCOMETSinput(filename)
                    exmodeldata <- getModelData(exmetabdata,colvars="age")
                    excorrdata <- getCorr(exmodeldata,exmetabdata,"DPP")
                    makeOutputCSV("corr",excorrdata,"DPP")
                    list(
                      status = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.",
                      excorrdata = excorrdata
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
                returnValue$error <<- e$message
                return(NULL)
            }
        )
    }))
    toJSON(returnValue, auto_unbox = T)
}
