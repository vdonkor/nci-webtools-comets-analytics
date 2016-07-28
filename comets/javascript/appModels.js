appComets.HarmonizationFormModel = Backbone.Model.extend({
    defaults: {
        cohortList: ["DPP","EPIC","PLCO-CRC","PLCO-breast","Shanghai","WHI","Other"],
        cohortSelection: null,
        covariates: [],
        csvFile: null,
        exposure: [],
        methodSelection: "Batch",
        modelDescription: "Unadjusted",
        modelList: [],
        modelOptions: [],
        modelSelection: null,
        outcome:[ "all metabolites" ],
        status: false
    }
});

appComets.IntegrityResultsModel = Backbone.Model.extend({
    defaults: {
        dateRun: new Date().toLocaleDateString(),
        integrityChecked: false,
        log2var: null,
        metab: [],
        metabId: null,
        models: [],
        "num.min": null,
        status: null,
        statusMessage: null,
        subjectdata: [],
        subjectmeta: [],
        modelOptions: [],
        subjectID: null,
        varmap: []
    },
    url: "/cometsRest/integrityCheck",
    parse: function (response, xhr) {
        // Shiny used to handle this for us, but it makes more sense to do here anyway
        var sum = function(prev,curr,index,arr) { return prev+curr; };
        var subjectdataIds = response.allSubjectMetaData.slice();
        subjectdataIds.unshift(response.subjId);
        var metaboliteIds = response.allMetabolites.slice();
        metaboliteIds.unshift(response.subjId);
        $.extend(response,{
            inputDataSummary: {
                'Metabolites Sheet': response.metab.length + ' metabolites',
                'Subject data sheet': response.allSubjects.length + ' subjects with ' + response.allSubjectMetaData.length + ' covariates',
                'Subject metabolites sheet': response.subjdata.length + ' subjects with ' + (Object.keys(response.subjdata[0]).length-response.allSubjectMetaData.length-1) + ' metabolites'
            },
            integrityChecked: true,
            metaboliteSummary: {
                'N Metabolites': response.metab.length,
                'N Harmonized': response.metab.map(function(obj) { return 'uid_01' in obj ? 1 : 0; }).reduce(sum),
                'N Non-Harmonized': response.metab.map(function(obj) { return 'uid_01' in obj ? 0 : 1; }).reduce(sum),
                'N with zero variance': response.metab.map(function(obj) { return obj.log2var==0 ? 1 : 0; }).reduce(sum),
                'N with >25% at min': response.metab.map(function(obj) { return obj['num.min']>response.subjdata.length*.25; }).reduce(sum)
            },
            models: response.mods,
            status: response.integritymessage.toLowerCase().indexOf("error") < 0,
            statusMessage: response.integritymessage
        });
        delete response.integritymessage;
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
        // options need to be array of objects for selectize plugin
        response.modelOptions = response.allMetabolites.concat(response.allSubjectMetaData).map(function(subject) {
            return {
                text: subject,
                value: subject
            };
        });
        response.modelOptions.unshift({
            text: 'All Metabolites',
            value: 'all metabolites'
        });
        response.log2var = response.metab.map(function (obj) { return obj.log2var; });
        response['num.min'] = response.metab.map(function (obj) { return obj['num.min']; });
        delete response.allMetabolites;
        delete response.allSubjectMetaData;
        delete response.allSubjects;
        delete response.mods;
        console.log(response);
        return response;
    }
});

appComets.CorrelationResultsModel = Backbone.Model.extend({
    defaults: {
        csvFile: null,
        excorrdata: [],
        exposures: [],
        plotHeight: 500,
        status: false,
        statusMessage: "An unknown error occurred",
        tableOrder: [ "age", "age.n", "age.p", "model", "cohort", "adjvars", "metabolite_name", "hmdb_id", "rt", "m_z", "uid_01", "hmdb", "biochemical" ]
    },
    url: "/cometsRest/correlate",
    parse: function (response, xhr) {
        if (response.exposures.constructor !== Array) response.exposures = [response.exposures];
        response.excorrdata = response.excorrdata.map(function(biochemical) {
            biochemical.model = response.model;
            return biochemical;
        });
        delete response.model;
        console.log(response);
        return reponse;
    }
});