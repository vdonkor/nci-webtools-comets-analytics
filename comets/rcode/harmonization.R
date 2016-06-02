library(jsonlite)

#######################
# function to read in files that are input by users for Quality Control Check
#######################
readInputQCFiles <- function(input) {
  input = fromJSON(input)
  
  uidsfile = input$uidsfile
  refmetfile = input$refmetfile
  
  uids = refmet = data.frame()
  
  if(!is.null(uidsfile))
    uids = read.delim(uidsfile, sep=',', header=T)

  if(!is.null(refmetfile))
    refmet = read.delim(refmetfile, sep=',', header=T)
  
  toJSON(list(
      uids = uids,
      refmet = refmet
    )
  )
}# end readInputQCFiles


#######################
# function to read in files that are input by users for Harmonization Check
#######################
readInputHarmFiles <- function(input) {
    
  metlistfile = input$metlist
  metlist = masteruids = data.frame()

  if (!is.null(metlistfile)) {
    metlist=read.delim(metlistfile$datapath,sep=",",header=F)
    masteruids=read.delim("uid.csv",sep=",",header=T)
  }

  toJSON(list(
    names = metlist[,1],
    masteruids = masteruids
    )
  )
} # end readInputHarmFiles


#######################
# Reactive function to merged uids with refmet
#######################
mergeInputFiles <- reactive({
	mydat=readInputQCFiles()
	if (is.null(mydat))
      		return(NULL)

	refmet=mydat$refmet
	uids=mydat$uids
	colnames(refmet)=c("BIOCHEMICAL","Refmet_NAME","Refmet_formula","Refmet_Mass",
	 "Refmet_MW.structure")

	if (all.equal(as.character(uids$BIOCHEMICAL),as.character(refmet$BIOCHEMICAL))){
		uids_withrefmet=cbind(uids,refmet[,-which(colnames(refmet)=="BIOCHEMICAL")])
	}
	else {
	 myind=as.numeric(lapply(uids$BIOCHEMICAL,function(x) which(refmet$BIOCHEMICAL==x)[1]))
	 uids_withrefmet=cbind(uids,refmet[,-which(colnames(refmet)=="BIOCHEMICAL")])
	 }
	uids_withrefmet$dbid=paste("dbid",1:nrow(uids_withrefmet),sep="_")
	return(uids_withrefmet)
})

#######################
# Reactive function to count the number of rows that contain a given unique metabolite name and return duplicates
#######################
getDups <- reactive({
	mydat=readInputQCFiles()
	if (is.null(mydat)) return(NULL)
	else {
	 uniqnames=unique(unlist(mydat$uids[,grep("_NAME", colnames(mydat$uids))]))
         uniqnames=uniqnames[-c(which(is.na(uniqnames)),which(uniqnames==""))]
         # rows that contain a unique metabolite name
        #print(levels(uniqnames)) 
	myind=sapply(uniqnames,function(mymetab) {
                temp=unique(as.numeric(unlist(lapply(grep("_NAME", colnames(mydat$uids)),function(x) 
			which(as.character(mydat$uids[,x])==as.character(mymetab)))))) 
		out=temp[!is.na(temp)]
                 length(unique(out))
         })
	print(paste("Mycounts: ",length(myind),length(uniqnames)))

	dups=c()
         for (x in which(myind>=2)) {
                 tempmetab=uniqnames[x]
                 temp=unique(as.numeric(unlist(lapply(grep("_NAME", colnames(mydat$uids)),
                         function(x) which(as.character(mydat$uids[,x])==as.character(tempmetab))))))
                 dups=rbind(dups,mydat$uids[temp,c("BIOCHEMICAL",colnames(mydat$uids)[grep("_NAME", colnames(mydat$uids))])]    )
         }

	return(dups)	
	}
})

#######################
# Output # rows and columns for uids and refmet
#######################
output$InputFilesStats <- renderTable({
        mydat=readInputQCFiles()
	if (is.null(mydat))
      return(NULL)
	mystats=data.frame(nrows=c(nrow(mydat$uids),nrow(mydat$refmet)),
		ncols=c(ncol(mydat$uids),ncol(mydat$refmet)))
	
            myharmstats <- data.frame(Files=c("Uids","Refmet"),NumRows=c(mystats$nrows),
		NCols=c(mystats$ncols))
            return(myharmstats)
        })

#######################
# Output some stats on the uids file
#######################
output$InputUidsStats <-renderTable({
	mydat=readInputQCFiles()
	if (is.null(mydat)) {print("NOTHING");return(NULL)}	
	else {
	print("We have data")
	numnonid=regexpr("^X ", mydat$uids$BIOCHEMICAL)
	print(table(numnonid))
	myuidsstats <- data.frame(Type=c("Total","With identified biochemical name",
		"W/o identified biochemical name","With NCI_NAME",
		"With BROAD_NAME","With FENLAND_METABOLON_NAME", "With FENLAND_BIOCRATES_NAME",
		"With ARIC_NAME1","With ARIC_NAME2","With UCLEB_NMR_NAME","With SHANGHAI_CHD_NAME"),
		Number_metabolites=c(nrow(mydat$uids),
	length(which(numnonid==(-1))),
	length(which(numnonid==1)),
	length(which(!is.na(mydat$uids$NCI_NAME))),
	length(which(!is.na(mydat$uids$BROAD_NAME))),
	length(which(!is.na(mydat$uids$FENLAND_METABOLON_NAME))),
	length(which(!is.na(mydat$uids$FENLAND_BIOCRATES_NAME))),
	length(which(!is.na(mydat$uids$ARIC_NAME1))),
	length(which(!is.na(mydat$uids$ARIC_NAME2))),
	length(which(!is.na(mydat$uids$UCLEB_NMR_NAME))),
	length(which(!is.na(mydat$uids$SHANGHAI_CHD_NAME)))))
	return(myuidsstats)
	}
})	

#######################
# Gets stats on pathways that are covered
#######################
output$InputUidsPathwayStats <- renderTable({
	mydat=readInputQCFiles()
	if (is.null(mydat)) {return(NULL)}
	else {
	mypathstats<-data.frame(Type=c("HMDB",
		"PUBCHEM","CHEMSPIDER","KEGG (compound)"),
		Number_Metabolites=c(
		length(which(!is.na(mydat$uids$HMDB_ID))),
		length(which(!is.na(mydat$uids$PUBCHEM))),
		length(which(!is.na(mydat$uids$CHEMSPIDER))),
		length(which(!is.na(mydat$uids$KEGG)))))
	return(mypathstats)
	}
})


#######################
# Merge uids with refmet and output some stats
#######################
output$MapInputToRefmet <- renderTable({
	mydat=mergeInputFiles()
	if (is.null(mydat))
      		return(NULL)
	numnonid=regexpr("^X ", mydat$BIOCHEMICAL)
	numidentified=length(which(numnonid==(-1)))
	return(data.frame(Num_Identified=numidentified,
		Refmet_Mapped=length(which(!is.na(mydat$Refmet_NAME))),
		Perc_mapped=round(length(which(!is.na(mydat$Refmet_NAME)))/numidentified*100,2),
		Refmet_Unmapped=length(which(is.na(mydat$Refmet_NAME)))))
})	

#######################
# Plot # platforms a given metabolite appears in
#######################
output$NumPlatperMetabPlot <- renderPlot({
	mydat=readInputQCFiles()
	if (is.null(mydat))
		return(NULL)	

	else {
		temp=mydat$uids[,c(which(colnames(mydat$uids)=="BIOCHEMICAL"),grep ("_NAME",colnames(mydat$uids)))]
		mycounts=as.numeric(apply(temp,1,function(x) (ncol(temp)-1)-length(which(is.na(x)))))
		x=barplot(table(mycounts),xlab="# Platforms",ylab="# Metabolites",ylim=c(0,max(table(mycounts))+100),main="# platforms per metabolite")
		text(x = x, y = table(mycounts)+20, label = table(mycounts), pos = 3, cex = 0.8)
	}
})

#######################
# Download metabolites with duplicate BIOCHEMICAL entries
#######################
output$downloadduplicates <- downloadHandler(
	filename="DuplicateMetabolites.txt",
	content=function(file) {
		dups=getDups()
        	write.table(dups,quote=F,sep="\t",row.names=F,col.names=T,file=file)
	}
)


#######################
# Map list of metabolites to harmonized list (Harmonization Check)
#######################
output$NumHarmMetabCheck <- renderTable({
	mymets=readInputHarmFiles()
	if (is.null(mymets))
		return(NULL)
	else {
		numharm=length(intersect(mymets$names,unique(unlist(mymets$masteruids[,c(which(colnames(mymets$masteruids)=="BIOCHEMICAL"),grep("_NAME", colnames(mymets$masteruids)))]))))
		return(data.frame(Num_Harmonized=numharm,Num_NonHarmonized=length(mymets$names)-numharm))
	}
})

#######################
# Download list of non-harmonized metabolites (Harmonization Check)
#######################
output$downloadnonharmmetab <- downloadHandler(
	filename="NonHarmonizedMetabolites.txt",
	content=function(file){
		mymets=readInputHarmFiles()
		nonharm=setdiff(mymets$names,unique(unlist(mymets$masteruids[,c(which(colnames(mymets$masteruids)=="BIOCHEMICAL"),grep("_NAME", colnames(mymets$masteruids)))])))
		write.table(nonharm,quote=F,sep="\t",row.names=F,col.names=F,file=file)
	}
)

#######################
# Download list of harmonized metabolites (Harmonization Check)
#######################
output$downloadharmmetab <- downloadHandler(
        filename="HarmonizedMetabolites.txt",
        content=function(file){
                mymets=readInputHarmFiles()
                harm=intersect(mymets$names,unique(unlist(mymets$masteruids[,c(which(colnames(mymets$masteruids)=="BIOCHEMICAL"),grep("_NAME", colnames(mymets$masteruids)))])))
                write.table(harm,quote=F,sep="\t",row.names=F,col.names=F,file=file)
        }
)



}) # end shinyServer


