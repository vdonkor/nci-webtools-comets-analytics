library(shiny)
library(shinyjs)
library(ggplot2)
#library(haven)
library(readxl)
library(plyr)
library(dplyr)
library(reshape2)
library(RColorBrewer)
#library(ppcor)
library(psych)
library(tidyr)
library(GeneNet)
library(Rgraphviz)
library(d3heatmap)
library(plotly)
library(stringr)
library(RJSONIO)
source("./server.R")

OUTPUT_DIR <- './tmp/'
dir.create(OUTPUT_DIR)

processWorkbook <- function(filename) {
    path = file.path("uploads",filename)

    sheets = excel_sheets(path)
    
    metabSheet = fixData(read_excel(path, sheets[[1]] ))
    subjMetabSheet = fixData(read_excel(path, sheets[[2]] ))
    subjDataSheet = fixData(read_excel(path, sheets[[3]]))
    varMapSheet = fixData(read_excel(path, sheets[[4]] ))
    
    result = CheckIntegrity(metabSheet,subjMetabSheet,subjDataSheet,varMapSheet)
    
#     result$inputStats$metab <- paste( length(result$dta.metab$metabid), "metabolites")
#     result$inputStats$subj <- paste( length(result$dta.sdata$id), "subjects with", ncol(result$dta.sdata) - 1, "covariates")
#     result$inputStats$subjMeta <- paste(nrow(result$dta.sdata)," subjects with ", ncol(result$dta.sdata)-length( names(result$dta.sdata)[-1])-1, " metabolites",sep="")
    
    toJSON(result)
    
}