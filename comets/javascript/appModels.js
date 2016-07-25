appComets.IntegrityResultsModel = Backbone.Model.extend({
    defaults: {
        csvFile: null,
        dateRun: new Date().toLocaleDateString(),
        integritymessage: null,
        metab: [],
        metabId: null,
        models: [],
        status: null,
        subjectdata: [],
        subjectmeta: [],
        subjectOptions: [],
        subjectID: null,
        varmap: [],
        // form writebacks
        cohortSelection: "",
        methodSelection: null,
        modelSelection: null,
        modelDescription: "",
        outcome:[ "All metabolites" ],
        exposure: [],
        covariates: []
    },
    urlRoot: "/cometsRest/integrityCheck",
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
        response.subjectOptions = response.allMetabolites.concat(response.allSubjectMetaData).map(function(subject) {
            return {
                text: subject,
                value: subject
            };
        });
        delete response.allMetabolites;
        delete response.allSubjectMetaData;
        delete response.allSubjects;
        delete response.mods;
    }
});

appComets.CorrelationResultsModel = Backbone.Model.extend({
    defaults: {
        csvFile: null,
        excorrdata: [],
        status: false,
        statusMessage: "An unknown error occurred",
        tableOrder: [ "age", "age.n", "age.p", "model", "cohort", "adjvars", "metabolite_name", "hmdb_id", "rt", "m_z", "uid_01", "hmdb", "biochemical" ]
    },
    urlRoot: "/cometsRest/correlate",
    parse: function (response, xhr) {
        response.excorrdata = response.excorrdata.map(function(biochemical) {
            biochemical.model = response.model;
            return biochemical;
        });
        delete response.model;
        console.log(response);
    }
});