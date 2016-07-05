
library(plyr)
library(dplyr)
library(readxl)
library(jsonlite)

#################################################################################
#' Converts all sheets in a workbook to a list
#'
#' @param filepath Path to excel file
#' @return A list containing the contents of the workbook
#' @examples
#' readExcel('examples/cometsInput.xlsx')
#################################################################################
readExcel <- function(filepath) {
  
  sheets = excel_sheets(filepath)
  
  # process each sheet
  x = lapply(sheets, function(X) {
    sheet = read_excel(filepath, sheet = X)
    
    # ignore rows with all NA values
    sheet = sheet[!apply(is.na(sheet), 1, all), ]
    
    # convert column names to lowercase
    names(sheet) = tolower(names(sheet))
    
    sheet
  })

  names(x) = tolower(sheets)
  x
}



#################################################################################
#' Check integrity of input excel file
#'
#' @param filepath Path to excel file
#' @return A list representing the workbook, as well as any error messages
#' @examples
#' checkIntegrity('examples/cometsInput.xlsx')
#################################################################################
checkIntegrity <- function(filepath) {
  
  # input$metabolites         = metabolite meta data  (sheet 1)
  # input$subjectmetabolites  = abundance data        (sheet 2)
  # input$subjectdata         = subject meta data     (sheet 3)
  # input$varmap              = variable mapping data (sheet 4)
  
  input          = readExcel(filepath)
  output         = input
  
  metabolites    = input$metabolites
  subjectmeta    = input$subjectmetabolites
  subjectdata    = input$subjectdata
  varmap         = input$varmap
  
  metaboliteID   = varmap$cohortvariable[tolower(varmap$varreference) == 'metabolite_id']
  subjectID      = varmap$cohortvariable[tolower(varmap$varreference) == 'id']
  
  output$message = {
    if (length(metaboliteID) == 0) 
      'Error: Metabolite ID not found as a parameter in VarMap sheet! Specify which column should be used for metabolite ID'
  
    else if (length(subjectID) == 0)
      'Error: Subject ID not found as a parameter in VarMap sheet! Specify which column should be used for subject ID'
  
    else if (!metaboliteID %in% colnames(metabolites))
      paste0('Error: Metabolite ID from VarMap sheet (', metaboliteID, ') does not match column name from Metabolites Sheet')
  
    else if (!subjectID %in% colnames(subjectdata))
      paste0('Error: Sample ID from VarMap sheet (', metaboliteID, ') does not match column name from SubjectData Sheet')
    
    else if (n_distinct(subjectdata[[subjectID]]) != n_distinct(subjectmeta[[subjectID]]))
      'Warning: Number of subjects in SubjectData sheet does not match number of subjects in SubjectMetabolites sheet'

    else if (anyDuplicated(colnames(subjectmeta)))
      'Warning: Metabolite abundances sheet (SubjectMetabolites) contains duplicate columns (metabolite names)'

    else if (anyDuplicated(subjectdata[[subjectID]]))
      'Warning: Sample Information sheet (SubjectData) contains duplicate ids'

    else if (anyDuplicated(metabolites[[metaboliteID]]))
      'Warning: Metabolite Information sheet (Metabolites) contains duplicate metabolite ids'
    
    else
      'Success: Input data has passed QC (metabolite and sample names match in all sheets)'
  }
  
  output$success = !grepl('Error', output$message)
  
  # convert columns to lowercase if no error messages were found
  if (output$success) {
    output$metabolites[[metaboliteID]] = tolower(metabolites[[metaboliteID]])
    output$subjectdata[[subjectID]]    = tolower(subjectdata[[subjectID]])
    output$subjectmeta[[subjectID]]    = tolower(subjectmeta[[subjectID]])
  }
  
  output$metaboliteID = tolower(metaboliteID)
  output$subjectID    = tolower(subjectID)
  output
}



#################################################################################
#' Read data from excel file
#'
#' @param filepath Path to excel file
#' @return A list containing the excel file contents
#' @examples
#' readData('examples/cometsInput.xlsx')
#################################################################################
readData <- function(filepath) {
  
  input = checkIntegrity(filepath)
  output = input
  
  # input$metabolites         = metabolite meta data  (sheet 1)
  # input$subjectmetabolites  = abundance data        (sheet 2)
  # input$subjectdata         = subject meta data     (sheet 3)
  # input$varmap              = variable mapping data (sheet 4)
  # input$metaboliteID        = metabolite ID
  # input$subjectID           = subject ID
  # input$message             = quality check message
  # input$modelspec           = 'Batch' or 'Interactive'

  dt = inner_join(input$subjectdata, input$subjectmeta)
  
  # refactored readData function
  if (input$success)
    output$results = list(
      integrityCheck = list(
        inputDataSummary = list(
          'Metabolites Sheet' = paste(length(input$metabolites[[input$metaboliteID]]), 'metabolites'),
          'Subject data sheet' = paste(nrow(input$subjectdata), 'subjects with', ncol(input$subjectdata) -1, 'covariates'),
          'Subject metabolites sheet' = paste(nrow(dt), 'subjects with', ncol(dt) - length(names(input$subjectdata[-1])) - 1, 'metabolites')
        ),
        
        metaboliteSummary = list(
          'N Metabolites' = 0,
          'N Harmonized' = 0,
          'N Non-Harmonized' = 0,
          'N with zero variance' = 0,
          'N with >25% at min' = 0
        ),
        
        plots = list(
          c(),
          c()
        )
      ),
      
      summary = list(
        correlationResults = list()
      ),
      
      heatmap = list(
        plots = list(
          c()
        )
      ),
      
      clusterAndHeatmap = list(
        c()
      )
    )

  toJSON(output, auto_unbox = T)
}










