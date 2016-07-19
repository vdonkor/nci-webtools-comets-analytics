library(readxl)
library(dplyr)
library(reshape2)
library(stringr)
library(jsonlite)


source("./cometsFunctions.R")

processWorkbook <- function(filename) {
    
    path = file.path("uploads", filename)

    readData(path)
    
}
