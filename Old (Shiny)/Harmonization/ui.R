# Ewy Mathe

library(shiny)
library(markdown) # for shinyapps.io deployment
#build list of names for uids

shinyUI(fluidPage(
  titlePanel("COMETS Harmonization Tool"),

  sidebarLayout(
    sidebarPanel(
	h4(em("For Quality Control Check tab:")),
	fileInput('uids', ('Input Harmonized Data File\n(.csv format)'),
                accept=c('.csv')),
	fileInput('refmet', 'Input Refmet Mapping File\n(e.g. at least 3 columns: UIDS, BIOCHEMICAL name and Refmet columns)',
		accept=c(".csv")),
	hr(style="border-top: 2px solid #ccc;"),
	h4(em("For Harmonization Check tab:")),
	fileInput('metlist','Input List of metabolite names\none name per line (.txt format)',
		accept=c('.txt'))
    ), # end sidebarLayout
    
    mainPanel(
      tabsetPanel(type = "tabs",
          tabPanel("About",
                    includeMarkdown("readme.md")
          ),

          tabPanel("Quality Control Check",
		h4("Please input uids.xls file and Refmet Mapping file on the left side of this page."),
	        h4("Stats on input files"),
	  	tableOutput('InputFilesStats'),
			  
		h4("Stats on metabolites in harmonized data file (uids)"),
		   tableOutput('InputUidsStats'),

		h4("Of the identified metabolites, there is coverage in the following pathway databases:"),
		tableOutput('InputUidsPathwayStats'),

		h4("How many input metabolites map to Refmet?"),
		tableOutput('MapInputToRefmet'),

		h4("Number of platforms a given metabolite appears in?"),
		h6("For each metabolite, the number of different platforms it appears in is calculated based on the_NAME id."),
		plotOutput("NumPlatperMetabPlot"),
		
		h4("Are there duplicate BIOCHEMICAL names with a different _NAME?"),
		h6("The Refmet_NAME is not taken into account here"),
		downloadButton("downloadduplicates", "Download list of duplicate BIOCHEMICAL metabolite names")
	    ),

	    tabPanel("Harmonization Check",
	    	h4("Please submit a list of metabolite names on the left side of this page to check how many of the input metabolites are already harmonized by the COMETS harmonization group."),
		tableOutput('NumHarmMetabCheck'),
		downloadButton("downloadnonharmmetab","Download list of non-harmonized metabolites and send to COMETS harmonization group"),
		downloadButton("downloadharmmetab","Download list of harmonized metabolites")
	    )
       )
    ),
    fluid=FALSE
  )
))
