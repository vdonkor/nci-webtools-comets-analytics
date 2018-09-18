library(stringr)
library(jsonlite)
#library(COMETS)
library(stats)

temp_dir = 'tmp/'
dir.create(temp_dir)

#' Returns a timestamp which includes microseconds
#' @return [character] The current date and time
get_timestamp <- function() {
  format(Sys.time(), '%Y%m%d_%H%M%OS6')
}

#' Gets cohort names from the compiled uids file
#' @return [character] A json string containing cohort names
get_comets_cohorts <- function() {
  # load compileduids.RData
  load(system.file(
    "extdata", "compileduids.RData",
    package = "COMETS"
  ))

  # return only cohort names
  cohorts$Cohort
}

#' Gets references and definitions from the VarMap sheet of a COMETS input file
#' @param filepath The path to the input file
#' @return [list] A list containing references and definitions
get_varmap <- function(filepath) {
  varmap <- readxl::read_excel(filepath, sheet = "VarMap")

  references <- varmap$VARREFERENCE
  definitions <- varmap$VARDEFINITION
  names(definitions) <- references

  list(
    references = references,
    definitions = as.list(definitions)
  )
}

#' Gets default templates for COMETS input spreadsheets
#' @return [character] A json string containing template information
get_comets_templates <- function() {

  # get absolute paths to the input spreadsheets
  age_input_filepath <- system.file(
    "extdata", "cometsInputAge.xlsx",
    package = "COMETS"
  )
  basic_input_filepath <- system.file(
    "extdata", "cometsInputBasic.xlsx",
    package = "COMETS"
  )

  # load varmaps for each template
  age_varmap <- get_varmap(age_input_filepath)
  basic_varmap <- get_varmap(basic_input_filepath)

  # return two template definitions
  list(
    list(
      text = "Age",
      value = "age",
      data = age_varmap$definitions,
      varlist = age_varmap$references
    ),
    list(
      text = "Basic",
      value = "basic",
      data = basic_varmap$definitions,
      varlist = basic_varmap$references
    )
  )
}

#' Reads and verifies COMETS input
#' @param filepath The path to the input file
read_comets_input <- function(filepath) {

  data <- COMETS::readCOMETSinput(filepath)

  data$stratifiable <- t(as.data.frame(apply(
    data$subjdata[data$allSubjectMetaData],
    2,
    function(...) { !any(table(...) < 15) }
  )))# && length(as.vector(mdCol)) > 1

  subjectMetadata <- as.data.frame(data$allSubjectMetaData)
  subjectMetadata[,1] <- as.character(lapply(
      data$allSubjectMetaData,
      function(value) {
          match = value == data$vmap$cohortvariable
          if (any(match)) {
              return(data$vmap$varreference[match])
          } else {
              return(value)
          }
      }
  ))
  subjectMetadata[,2] <- subjectMetadata[,1]
  names(subjectMetadata) <- c('value','text')
  colnames(data$stratifiable) <- subjectMetadata[,1]
  data$stratifiable <- as.list(as.data.frame(data$stratifiable))
  data$allSubjectMetaData <- subjectMetadata
  data
}

run_comets_model(metabolite_data, )


run_comets_model <- function(json) {
  input <- jsonlite::fromJSON(json)
  exmetabdata <- COMETS::readCOMETSinput(input$filename)
  exmodeldata <- COMETS::getModelData(exmetabdata,
    modelspec=input$methodSelection,
    modlabel=input$modelSelection,
    rowvars=input$outcome,
    colvars=input$exposure,
    adjvars=input$covariates,
    strvars=input$strata,
    where=input$whereQuery
  )
  excorrdata <- COMETS::runCorr(exmodeldata,exmetabdata,input$cohortSelection)
  if (length(excorrdata) <= 0) {
    stop("The result contains no correlation data.")
  }
  csv <- OutputCSVResults(paste0('tmp/corr',timestamp),excorrdata,input$cohortSelection)
  heatmapdata = excorrdata[!is.na(excorrdata$pvalue),]
  clustersort = NULL
  if (length(unique(heatmapdata$outcomespec)) > 1 && length(unique(heatmapdata$exposurespec)) > 1 && length(unique(excorrdata$stratavar)) < 1) {
    heatmapdata <- tidyr::spread(dplyr::select(heatmapdata,outcomespec,exposurespec,corr),exposurespec,corr)
    rownames(heatmapdata) <- heatmapdata[,1]
    heatmapdata <- heatmapdata[,2:ncol(heatmapdata)]
    heatmapdata <- as.matrix(heatmapdata)
    rowDendrogram = rev(reorder(as.dendrogram(hclust(dist(heatmapdata))), rowMeans(heatmapdata,na.rm=TRUE)))
    colDendrogram <- rev(reorder(as.dendrogram(hclust(dist(t(heatmapdata)))), colMeans(heatmapdata,na.rm=TRUE)))
    heatmapdata <- heatmapdata[order.dendrogram(rowDendrogram),order.dendrogram(colDendrogram)]
    exposureLookup <- excorrdata[!duplicated(excorrdata[,'exposurespec']),c('exposure','exposurespec')]
    exposureLookup <- exposureLookup[exposureLookup$exposurespec %in% colnames(heatmapdata),]
    exposureLookup <- exposureLookup[order(exposureLookup[,'exposurespec']),]
    exposureLookup$heatmaporder <- order(colnames(heatmapdata))
    outcomeLookup <- excorrdata[!duplicated(excorrdata[,'outcomespec']),c('outcome','outcomespec')]
    outcomeLookup <- outcomeLookup[outcomeLookup$outcomespec %in% rownames(heatmapdata),]
    outcomeLookup <- outcomeLookup[order(outcomeLookup[,'outcomespec']),]
    outcomeLookup$heatmaporder <- order(rownames(heatmapdata))
    clustersort = list(
      col=exposureLookup[order(exposureLookup$heatmaporder),'exposure'],
      colTree=makeBranches(colDendrogram,exposureLookup),
      row=outcomeLookup[order(outcomeLookup$heatmaporder),'outcome'],
      rowTree=makeBranches(rowDendrogram,outcomeLookup)
    )
  }
  if (!is.null(excorrdata$corr)) {
    excorrdata[,'corr'] <- with(excorrdata,format(round(as.numeric(corr),3),scientific=FALSE,digits=I(3)))
  }
  if (!is.null(excorrdata$pvalue)) {
    excorrdata[,'pvalue'] <- with(excorrdata,format(as.numeric(pvalue),scientific=TRUE,digits=I(3)))
  }
  if(any(names(excorrdata) == "stratavar")) {
    strataVector <- excorrdata[!duplicated(excorrdata[,'stratavar']),'stratavar']
    strataFrame <- as.data.frame(strataVector)
    strataFrame[,2] <- strataFrame[]
    names(strataFrame) <- c('value','text')
  } else {
    strataFrame <- list()
  }
  list(
    clustersort = clustersort,
    csv = csv,
    excorrdata = excorrdata,
    exposures = excorrdata[!duplicated(excorrdata[,'exposure']),'exposure'],
    model = input$modelName,
    ptime = attr(excorrdata,"ptime"),
    status = TRUE,
    statusMessage = "Correlation analyses successful. Please download the file below to the COMETS harmonization group for meta-analysis.",
    strata = strataFrame,
    tableOrder = intersect(exmetabdata$dispvars, names(excorrdata))
  )
}

with_handler <- function(fn, ...) {
  output <- list()
  output$result <- tryCatch(
    fn(...),
    warning = function(w) {
      output$warnings <<- unique(append(output$warnings, w$message))
    },
    error = function(e) {
      output$error <<- e$message
    })
  output
}

with_error_handler = function(fn, ...) {
  output <- list()

  output$saveValue = suppressWarnings(
    suppressMessages(
      withCallingHandlers(
        fn(...),
        message = function(m) {
          print(m$message)
        },
        warning = function(w) {
          output$warnings <- unique(append(output$warnings, w$message))
        },
        error = function(e) {
          output$error <- list(
            status = FALSE,
            message = e$message
          )
        }
      )
    )
  )
  output
}


# checkIntegrity <- function(filename,cohort) {
#     timestamp = as.integer(Sys.time())
#     suppressWarnings(suppressMessages({
#         returnValue <- list()
#         returnValue$saveValue <- tryCatch(
#             withCallingHandlers(
#                 {
#                   exmetabdata = readCOMETSinput(filename)
#                   exmetabdata$stratifiable <- t(as.data.frame(apply(exmetabdata$subjdata# [exmetabdata$allSubjectMetaData],2,function(...) { mdCol = table(...); !any(mdCol < 15) })))# && # length(as.vector(mdCol)) > 1
#                   exmetabdata$csvDownload = OutputCSVResults(paste0('tmp/Harm',timestamp),exmetabdata$metab,cohort)
#                   subjectMetadata <- as.data.frame(exmetabdata$allSubjectMetaData)
#                   subjectMetadata[,1] <- as.character(lapply(
#                       exmetabdata$allSubjectMetaData,
#                       function(value) {
#                           match = value==exmetabdata$vmap$cohortvariable
#                           if (any(match)) {
#                               return(exmetabdata$vmap$varreference[match])
#                           } else {
#                               return(value)
#                           }
#                       }
#                   ))
#                   subjectMetadata[,2] <- subjectMetadata[,1]
#                   names(subjectMetadata) <- c('value','text')
#                   colnames(exmetabdata$stratifiable) <- subjectMetadata[,1]
#                   exmetabdata$stratifiable <- as.list(as.data.frame(exmetabdata$stratifiable))
#                   exmetabdata$allSubjectMetaData <- subjectMetadata
#                   exmetabdata
#                 },
#                 message=function(m) {
#                     print(m$message)
#                 },
#                 warning=function(w) {
#                     returnValue$warnings <<- unique(append(returnValue$warnings, w$message))
#                 }
#             ),
#             error=function(e) {
#                 returnValue$error <<- list(
#                     status = FALSE,
#                     integritymessage = e$message
#                 )
#                 return(NULL)
#             }
#         )
#     }))
#     output = toJSON(returnValue, auto_unbox = T)
#     filename = paste0('tmp/chkInt',timestamp,'.out')
#     fileConn = file(filename)
#     writeLines(output,fileConn)
#     close(fileConn)
#     filename
# }
#
# runModel <- function(jsonData) {
#     timestamp = as.integer(Sys.time())
#     suppressWarnings(suppressMessages({
#         returnValue <- list()
#         returnValue$saveValue <- tryCatch(
#             withCallingHandlers(
#                 {
#                     input = fromJSON(jsonData)
#                     exmetabdata <- readCOMETSinput(input$filename)
#                     exmodeldata <- getModelData(exmetabdata,
#                       modelspec=input$methodSelection,
#                       modlabel=input$modelSelection,
#                       rowvars=input$outcome,
#                       colvars=input$exposure,
#                       adjvars=input$covariates,
#                       strvars=input$strata,
#                       where=input$whereQuery
#                     )
#                     excorrdata <- runCorr(exmodeldata,exmetabdata,input$cohortSelection)
#                     if (length(excorrdata) <= 0) {
#                       stop("ModelNotRunException")
#                     }
#                     csv <- OutputCSVResults(paste0('tmp/corr',timestamp),excorrdata,input$cohortSelection)
#                     heatmapdata = excorrdata[!is.na(excorrdata$pvalue),]
#                     clustersort = NULL
#                     if (length(unique(heatmapdata$outcomespec)) > 1 && length(unique(heatmapdata$exposurespec)) > 1 # && length(unique(excorrdata$stratavar)) < 1) {
#                       heatmapdata <- tidyr::spread(dplyr::select(heatmapdata,outcomespec,exposurespec,corr),# exposurespec,corr)
#                       rownames(heatmapdata) <- heatmapdata[,1]
#                       heatmapdata <- heatmapdata[,2:ncol(heatmapdata)]
#                       heatmapdata <- as.matrix(heatmapdata)
#                       rowDendrogram = rev(reorder(as.dendrogram(hclust(dist(heatmapdata))), rowMeans(heatmapdata,# na.rm=TRUE)))
#                       colDendrogram <- rev(reorder(as.dendrogram(hclust(dist(t(heatmapdata)))), colMeans# (heatmapdata,na.rm=TRUE)))
#                       heatmapdata <- heatmapdata[order.dendrogram(rowDendrogram),order.dendrogram(colDendrogram)]
#                       exposureLookup <- excorrdata[!duplicated(excorrdata[,'exposurespec']),c('exposure',# 'exposurespec')]
#                       exposureLookup <- exposureLookup[exposureLookup$exposurespec %in% colnames(heatmapdata),]
#                       exposureLookup <- exposureLookup[order(exposureLookup[,'exposurespec']),]
#                       exposureLookup$heatmaporder <- order(colnames(heatmapdata))
#                       outcomeLookup <- excorrdata[!duplicated(excorrdata[,'outcomespec']),c('outcome','outcomespec')# ]
#                       outcomeLookup <- outcomeLookup[outcomeLookup$outcomespec %in% rownames(heatmapdata),]
#                       outcomeLookup <- outcomeLookup[order(outcomeLookup[,'outcomespec']),]
#                       outcomeLookup$heatmaporder <- order(rownames(heatmapdata))
#                       clustersort = list(
#                         col=exposureLookup[order(exposureLookup$heatmaporder),'exposure'],
#                         colTree=makeBranches(colDendrogram,exposureLookup),
#                         row=outcomeLookup[order(outcomeLookup$heatmaporder),'outcome'],
#                         rowTree=makeBranches(rowDendrogram,outcomeLookup)
#                       )
#                     }
#                     if (!is.null(excorrdata$corr)) {
#                       excorrdata[,'corr'] <- with(excorrdata,format(round(as.numeric(corr),3),scientific=FALSE,# digits=I(3)))
#                     }
#                     if (!is.null(excorrdata$pvalue)) {
#                       excorrdata[,'pvalue'] <- with(excorrdata,format(as.numeric(pvalue),scientific=TRUE,digits=I(3)# ))
#                     }
#                     if(any(names(excorrdata) == "stratavar")) {
#                       strataVector <- excorrdata[!duplicated(excorrdata[,'stratavar']),'stratavar']
#                       strataFrame <- as.data.frame(strataVector)
#                       strataFrame[,2] <- strataFrame[]
#                       names(strataFrame) <- c('value','text')
#                     } else {
#                       strataFrame <- list()
#                     }
#                     list(
#                       clustersort = clustersort,
#                       csv = csv,
#                       excorrdata = excorrdata,
#                       exposures = excorrdata[!duplicated(excorrdata[,'exposure']),'exposure'],
#                       model = input$modelName,
#                       ptime = attr(excorrdata,"ptime"),
#                       status = TRUE,
#                       statusMessage = "Correlation analyses successful. Please download the file below to the # COMETS harmonization group for meta-analysis.",
#                       strata = strataFrame,
#                       tableOrder = intersect(exmetabdata$dispvars,names(excorrdata))
#                     )
#                 },
#                 message=function(m) {
#                     print(m$message)
#                 },
#                 warning=function(w) {
#                     returnValue$warnings <<- unique(append(returnValue$warnings, w$message))
#                 }
#             ),
#             error=function(e) {
#                 message <- e$message
#                 if (message == "ModelNotRunException") {
#                   message <- "The results contain no correlation data."
#                 }
#                 returnValue$error <<- list(
#                     status = FALSE,
#                     statusMessage = message
#                 )
#                 return(NULL)
#             }
#         )
#     }))
#     output = toJSON(returnValue, auto_unbox = T)
#     filename = paste0('tmp/runMdl',timestamp,'.out')
#     fileConn = file(filename)
#     writeLines(output,fileConn)
#     close(fileConn)
#     filename
# }

makeBranches <- function(dendrogram,lookup) {
  root <- list(
    label = lookup[lookup[,2] == attributes(dendrogram)["label"]$label,1]
  )
  if (!is.leaf(dendrogram)) {
    root$branch <- lapply(dendrogram, makeBranches,lookup)
  }
  root
}

replaceList = function(frame,old) {
  if (length(old) < 1) return(old)
  names(frame) <- c('joint','new')
  new = as.data.frame(old)
  names(new) <- 'joint'
  new$order = 1:nrow(new)
  new = merge(frame,new,by='joint')
  new = new[order(new$order),]['new'][[1]]
  return(new)
}
