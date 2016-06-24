library(readxl)

# Converts all sheets in a workbook to a list
readExcel <- function(filepath) {
  sheets = excel_sheets(filepath)
  
  # Process each sheet
  x = lapply(sheets, function(X) {
    sheet = read_excel(filepath, sheet = X)
    
    # Ignore rows with all NA values
    index = apply(sheet, 1, function(x) all(is.na(x)))
    sheet = sheet[!index, ]
    
    # Convert names to lowercase
    names(sheet) = tolower(names(sheet))
    
    sheet
  })

  names(x) = tolower(sheets)
  x
}

# Integrity check of input Excel file
checkIntegrity <- function(filepath) {

  input         = readExcel(filepath)
  output        = input

# input$metabolites         = metabolite meta data  (sheet 1)
# input$subjectmetabolites  = abundance data        (sheet 2)
# input$subjectdata         = subject meta data     (sheet 3)
# input$varmap              = variable mapping data (sheet 4)

  metabolites   = input$metabolites
  subjectmeta   = input$subjectmetabolites
  subjectdata   = input$subjectdata
  varmap        = input$varmap

  metaboliteID  = varmap$cohortvariable[tolower(varmap$varreference) == "metabolite_id"]
  subjectID     = varmap$cohortvariable[tolower(varmap$varreference) == "id"]
  
  if (length(metaboliteID) == 0) {
    output$message = c(output$message, 
                       "Error: Metabolite id is not found as a parameter in VarMap sheet! Specify which column should be used for metabolite id.",
                       "\n")
  }
  
  else if (length(subjectID) == 0) {
    output$message = c(output$message, 
                       "Error: Subject id is not found as a parameter in VarMap sheet! Specify which column should be used for subject id.",
                       "\n")
  }

  else {
    metabolites[[metaboliteID]] = tolower(metabolites[[metaboliteID]])
    subjectdata[[subjectID]]    = tolower(subjectdata[[subjectID]])
    subjectmeta[[subjectID]]    = tolower(subjectmeta[[subjectID]])
    
    if (length(grep(metaboliteID, colnames(metabolites))) == 0) {
      output$message = c(output$message,
                         "Error: Metabolite ID from 'VarMap sheet' (", metaboliteID, ") does not match column name from 'Metabolites Sheet'",
                         "\n")
    }
    
    else if (length(grep(subjectID, colnames(subjectdata))) == 0) {
      output$message = c(output$message,
                         "Error: Sample ID from 'VarMap sheet' (", metaboliteID, ") does not match column name from 'SubjectData Sheet'",
                         "\n")
    }
    
    else if (length(unique(subjectdata[, subjectID])) != length(unique(subjectmeta[, subjectID]))) {
      output$message = c(output$message,
                         "Warning: Number of subjects in SubjectData sheet does not match number of subjects in SubjectMetabolites sheet",
                         "\n")
    }
    
    else if (length(unique(colnames(subjectmeta))) != ncol(subjectmeta)) {
      output$message = c(output$message,
                         "Warning: Metabolite abundances sheet (SubjectMetabolites) contains duplicate columns (metabolite names)",
                         "\n")
    }
    
    else if (length(unique(unlist(subjectdata[, subjectID]))) != nrow(subjectdata)) {
      output$message = c(output$message,
                         "Warning: Sample Information sheet (SubjectData) contains duplicate ids",
                         "\n")
    }
    
    else if (length(unique(unlist(metabolites[, metaboliteID]))) != nrow(metabolites)) {
      output$message = c(output$message,
                         "Warning: Metabolite Information sheet (Metabolites) contains duplicate metabolite ids",
                         "\n")
    }
  }
  
  if (is.null(output$message)) {
    output$message = "Input data has passed QC (metabolite and sample names match in all input files)"
  }
  
  output
}