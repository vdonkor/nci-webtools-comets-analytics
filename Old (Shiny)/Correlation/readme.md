## About this COMETS shiny app 
This shiny app will support all cohort-specific analyses of the COMETS consortium. Data are not saved in the system but the output must be downloaded and submitted for  meta-analyses. Alternatively, cohorts can choose to run their analyses locally using the COMETS package.

### Harmonize
Each cohort should specify the source of their metabolomic analyses under item 2 so that harmonization of metabolite names can be applied to the output file. 
#### Harmonization Report
Displays the status of the harmonization results. If some metabolites are missed, a listing of the correlations will be displayed.


### Correlate
A series of models will be run on each cohort in support of the age paper.  The analyses will result in metabolites (OUTCOMES) displayed in rows and the covariates (EXPOSURES) along columns. The input data file is assumed to have several sheets:
1. Metabolites - from harmonized metabolites output
2. SubjectMetabolites - abundances in columns and subject in rows
3. SubjectData - other exposure and adjustment variables
4. VarMap - maps the variables needed to conduct the cohort specific analysis. Specify the
name of variables under CohortVariable column. if the VarReference has the same name in the cohort, leave blank
5. Models - models used to conduct COMETS analysis. Outcomes, exposures and adjustment can specify multiple covariates delimited by spaces (ie: age bmi).

#### Correlation Heatmap
The heatmap displays the proper biochemical names for harmonized metabolites.  

#### Correlation Network
Using the genenet package, we display the partial correlation network of your outcomes, exposures and adjusted covariates.  There is an option to display the minimum correlation to display with a default of 0.40.  

#### Summary Statistics
Shows the distribution of all variables included in your data file.

## Manuscript 1 Analyses
Please specify your models as:

| Model                 | Covariate |  Adjustments |
|-----------------------|-----------|--------------|
|*1.1 Unadjusted*       | Age       | None         |
|*1.2 Race & Sex adj*   | Age       | Race & Sex   |
|*1.3 xxxx*             | Age       | xxxx         |


## Pending to do:
1. Change to spearman
2. N with minimum values


## Pending to do:
For questions or help:
COMETS: Steve Moore
Harmonizate: Ewy Mathe and Adam Risch
Correlate: Ella Temprosa

This work is done via the COMETS harmonization group activities.
[COMETS website](http://epi.grants.cancer.gov/comets/)




