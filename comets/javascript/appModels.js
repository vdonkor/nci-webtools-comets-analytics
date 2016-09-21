appComets.HarmonizationFormModel = Backbone.Model.extend({
    defaults: {
        cohortList: ["DPP", "EPIC", "PLCO-CRC", "PLCO-breast", "Shanghai", "WHI", "Other"],
        cohortSelection: null,
        covariates: [],
        csvFile: null,
        filename: null,
        exposure: [],
        metaboliteIds: [],
        methodSelection: "Batch",
        modelDescription: "Unadjusted",
        modelList: [],
        modelSelection: null,
        outcome:[ "All metabolites" ],
        showMetabolites: false,
        status: false,
        subjectIds: []
    }
});

appComets.IntegrityResultsModel = Backbone.Model.extend({
    defaults: {
        csvDownload: null,
        dateRun: new Date().toLocaleDateString(),
        integrityChecked: false,
        log2var: null,
        metab: [],
        metabId: null,
        models: [],
        "num.min": null,
        status: null,
        statusMessage: null,
//        subjectdata: [],
//        subjectmeta: [],
        modelOptions: [],
        subjectID: null,
        varmap: []
    },
    url: "/cometsRest/integrityCheck",
    parse: function (response, xhr) {
        // options need to be array of objects for selectize plugin
        var sum = function(prev,curr,index,arr) { return prev+curr; };
        $.extend(response, {
            inputDataSummary: {
                'Metabolites Sheet': response.metab.length + ' metabolites',
                'Subject data sheet': response.allSubjects.length + ' subjects with ' + response.allSubjectMetaData.length + ' covariates',
                'Subject metabolites sheet': response.subjdata.length + ' subjects with ' + (Object.keys(response.subjdata[0]).length - response.allSubjectMetaData.length - 1) + ' metabolites'
            },
            integrityChecked: true,
            log2var: response.metab.map(function (obj) { return obj.var; }),
            metaboliteIds: response.allMetabolites,
            metaboliteSummary: {
                'N Metabolites': response.metab.length,
                'N Harmonized': response.metab.map(function (obj) {
                    return 'uid_01' in obj ? 1 : 0;
                }).reduce(sum),
                'N Non-Harmonized': response.metab.map(function (obj) {
                    return 'uid_01' in obj ? 0 : 1;
                }).reduce(sum),
                'N with zero variance': response.metab.map(function (obj) {
                    return obj.log2var == 0 ? 1 : 0;
                }).reduce(sum),
                'N with >25% at min': response.metab.map(function (obj) {
                    return obj['num.min'] > response.subjdata.length * .25;
                }).reduce(sum)
            },
            models: response.mods,
            'num.min': response.metab.map(function (obj) {
                return obj['num.min'];
            }),
            status: response.integritymessage.toLowerCase().indexOf("error") < 0,
            statusMessage: response.integritymessage,
            subjectIds: response.allSubjectMetaData.map(function(subject) { return { text: subject, value: subject }; })
        });
        delete response.allMetabolites;
        delete response.allSubjectMetaData;
        delete response.allSubjects;
        delete response.integritymessage;
        delete response.mods;
        console.log(response);
        return response;
    }

});

appComets.CorrelationResultsModel = Backbone.Model.extend({
    defaults: {
        clusterResults: false,
        clustersort: [],
        colorscales: ["Blackbody", "Bluered", "Blues", "Earth", "Electric", "Greens", "Greys", "Hot", "Jet", "Picnic", "Portland", "Rainbow", "RdBu", "Reds", "Viridis", "YlGnBu", "YlOrRd"],
        correlationRun: false,
        csvFile: null,
        displayAnnotations: false,
        excorrdata: [],
        exposures: [],
        plotColorscale: "Viridis",
        plotHeight: 500,
        plotWidth: 800,
        sortRow: null,
        status: false,
        statusMessage: "An unknown error occurred",
        tableOrder: []
    },
    url: "/cometsRest/correlate",
    parse: function (response, xhr) {
        var excorrdata = response.excorrdata.map(function (biochemical) {
            return $.extend(biochemical, {
                model: response.model
            });
        });
        var exposures = response.exposures.constructor === Array ? response.exposures : [response.exposures];
        $.extend(response, {
            clusterResults: false,
            correlationRun: true,
            displayAnnotations: false,
            excorrdata: excorrdata,
            exposures: exposures,
            sortRow: exposures[0]
        });
        delete response.model;
        console.log(response);
        return response;
    }
});