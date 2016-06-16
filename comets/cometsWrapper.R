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
source("./server.R")

OUTPUT_DIR <- './tmp/'
dir.create(OUTPUT_DIR)

processWorkbook <- function(filename) {
    print("In processWorkbook")
    print( paste("Filename:", filename) )
    path = file.path("uploads",filename)
    
    print(c("path: ", path))
    
    sheets = excel_sheets(path)
    
    metabSheet = read_excel(path, sheets$Metabolites )
    subjMetabSheet = read_excel(path, sheets$SubjectMetabolites )
    subjDataSheet = read_excel(path, sheets$SubjectData )
    varMapSheet = read_excel(path, sheets$VarMap )
    
    print(sheets)
    
    CheckIntegrity(metabSheet,subjMetabSheet,subjDataSheet,varMapSheet)
    
}