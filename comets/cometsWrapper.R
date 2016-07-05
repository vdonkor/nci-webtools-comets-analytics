#library(shiny)
#library(shinyjs)
#library(ggplot2)
#library(haven)
library(readxl)
#library(plyr)
library(dplyr)
library(reshape2)
#library(RColorBrewer)
#library(ppcor)
#library(psych)
#library(tidyr)
#library(GeneNet)
#library(Rgraphviz)
#library(d3heatmap)
#library(plotly)
library(stringr)
library(jsonlite)
#library(RJSONIO)


source("./cometsFunctions.R")

processWorkbook <- function(filename) {
    
    path = file.path("uploads", filename)

    readData(path)
    
}
