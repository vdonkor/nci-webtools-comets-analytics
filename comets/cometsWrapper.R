library(stringr)
library(jsonlite)
library(CometsAnalyticsPackage)

loadWorkbook <- function(filename) {
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