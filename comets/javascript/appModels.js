appComets.ResultsModel = Backbone.Model.extend({
    defaults: {
        csvFile: null,
        metabolites: [],
        subjectmetabolites: [],
        subjectdata: [],
        varmap: [],
        models: [],
        message: null,
        success: null,
        subjectmeta: [],
        metaboliteID: null,
        subjectID: null,
        dateRun: new Date().toLocaleDateString(),
        subjectOptions: [],
        cohortSelection: "",
        methodSelection: null,
        modelSelection: null,
        modelDescription: "",
        outcome:[],
        exposure: [],
        covariates: [],
        results: null,
        batch: true,
        interactive: false
    },
    urlRoot: "/cometsRest/correlate/integrity",
    parse: function (response, xhr) {
        // Shiny used to handle this for us, but it makes more sense to do here anyway
        var subjectdataIds = response.allSubjectMetaData.slice();
        subjectdataIds.unshift(response.subjId);
        var metaboliteIds = response.allMetabolites.slice();
        metaboliteIds.unshift(response.subjId);
        response.integrityCheck = {}
        response.integrityCheck.inputDataSummary = {
            'Metabolites Sheet': response.metab.length + ' metabolites',
            'Subject data sheet': response.allSubjects.length + ' subjects with ' + response.allSubjectMetaData.length + ' covariates',
            'Subject metabolites sheet': response.subjdata.length + ' subjects with ' + (Object.keys(response.subjdata[0]).length-response.allSubjectMetaData.length-1) + ' metabolites'
        }
        var sum = function(prev,curr,index,arr) { return prev+curr; };
        response.integrityCheck.metaboliteSummary = {
            'N Metabolites': response.metab.length,
            'N Harmonized': response.metab.map(function(obj) { return 'uid_01' in obj ? 1 : 0; }).reduce(sum),
            'N Non-Harmonized': response.metab.map(function(obj) { return 'uid_01' in obj ? 0 : 1; }).reduce(sum),
            'N with zero variance': response.metab.map(function(obj) { return obj.log2var==0 ? 1 : 0; }).reduce(sum),
            'N with >25% at min': response.metab.map(function(obj) { return obj['num.min']>response.subjdata.length*.25; }).reduce(sum)
        }
        response.subjectdata = response.subjdata.map(function(subject) {
            var newSubject = {};
            subjectdataIds.forEach(function(index) {
                newSubject[index] = subject[index];
            });
            return newSubject;
        });
        response.subjectmeta = response.subjdata.map(function(subject) {
            var newMetabolites = {};
            metaboliteIds.forEach(function(index) {
                newMetabolites[index] = subject[index];
            });
            return newMetabolites;
        });
        response.status = response.integritymessage.toLowerCase().indexOf("error") < 0;
        response.models = response.mods;
        // options need to be array of objects for selectize plugin
        options = [];
        _.each(Object.keys(response.allMetabolites[0]).concat(Object.keys(response.allSubjectMetaData[0])), function (subject) {
            options.push({
                text: subject,
                value: subject
            });
        });
        this.set('subjectOptions', options);
        delete response.allMetabolites;
        delete response.allSubjectMetaData;
        delete response.allSubjects;
        delete response.mods;
        console.log(response);
    }
});