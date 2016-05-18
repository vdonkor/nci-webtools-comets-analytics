




# This is the user-interface definition of a Shiny web application.
# You can find out more about building applications with Shiny here:
#
# http://shiny.rstudio.com
#
load("uids.Rda")
library(shiny)
library(ggvis)
library(markdown) # for shinyapps.io deployment
#build list of names for uids
library(d3heatmap)

shinyUI(navbarPage(
  "COMETS Analytics",
  
  tabPanel("About",
           includeMarkdown("readme.md")),
  tabPanel("Harmonize",
           titlePanel("Harmonize Your List of Metabolites")),
  tabPanel("Check integrity",
           titlePanel("QC for Metabolites")),
  tabPanel(
    "Correlate",
    titlePanel("Conduct cohort-specific correlation analyses"),
    sidebarLayout(
      sidebarPanel(
        selectInput(
          'cohort','1. Specify cohort',choices = c("DPP","EPIC","WHI","Other")
        ),
        fileInput('file1', '2. Choose Input Data File',
                  accept = c('.xlsx')),
        # c('.xpt','.csv', '.rda', '.xls','.xlsx', '.sas7bdat','.dta')),
        radioButtons(
          'modelspec','3. Method for model specification',choices =
            c("Batch","Interactive")
        ),
        conditionalPanel(
          condition = "input.modelspec == 'Interactive'",
          textInput('model','Describe model',value =
                      "Unadjusted"),
          uiOutput("xvars")
        )
        ,
        conditionalPanel(condition = "input.modelspec == 'Batch'",
                         uiOutput("xmods"))
      ),
      mainPanel(tabsetPanel(
        id = "dynTabs",
        tabPanel(
          "Summary",
          br(),
          dataTableOutput('correlate'),
          downloadButton('downloadData', 'Download results in CSV')
        ),
        tabPanel(
          "Heatmap",
          h3('Correlation Heatmap'),
          uiOutput("selectSort"),
          hr(),
          plotOutput("heatPlot")
        ),
        tabPanel(
          "Cluster and heatmap",
          h3('Hierarchical clustering and heatmap'),
          selectInput("palette", "Palette", c("Yellow and Red"="YlOrRd", "Red Yellow and Blues"="RdYlBu", "Greens", "Blues")),
          checkboxInput("cluster", "Apply clustering"),
          d3heatmapOutput("cheatmap")
        ),
        tabPanel(
          "Network",
          h3('Correlation network among row, column and adjusted Covariates'),
          sliderInput(
            "cutggm","Correlation cutoff",min = 0,max = 1,value = .4
          ),
          hr(),
          plotOutput("networkPlot")
        )
        
      ))
    )
  )
))
