appComets.HarmonizationFormModel = Backbone.Model.extend({
    defaults: {
        cohortList: ["DPP", "EPIC", "PLCO-CRC", "PLCO-breast", "Shanghai", "WHI", "Other"],
        cohortSelection: null,
        covariates: [],
        csvFile: null,
        filename: null,
        exposure: [],
        methodSelection: "Batch",
        modelDescription: "Unadjusted",
        modelList: [],
        modelOptions: [],
        modelSelection: null,
        outcome: ["All metabolites"],
        status: false
    }
//    , validate: function (attributes, options) {
//        errors = [];
//        if (attributes.csvFile === null && attributes.csvFile === undefined) {
//            errors.push({
//                name: "csvFile",
//                message: "You must upload a data file"
//            });
//        } else {
//            if (attributes.csvFile.type != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
//                errors.push({
//                    name: "csvFile",
//                    message: "You must upload an excel (xks, xlsx) workbook"
//                });
//            }
//        }
//
//        return errors.length > 0 ? errors : false;
//    }
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
        // options need to be array of objects for selectize plugin
        var modelOptions = [{
            text: 'All Metabolites',
            value: 'All metabolites'
        }].concat(
            response.allMetabolites.concat(response.allSubjectMetaData).map(function (subject) {
                return {
                    text: subject,
                    value: subject
                };
            })
        );
        var sum = function (prev, curr, index, arr) {
            return prev + curr;
        };
        var subjectdata = response.subjdata.map(function (subject) {
            var newSubject = {};
            newSubject[response.subjId] = subject[response.subjId];
            response.allSubjectMetaData.forEach(function (index) {
                newSubject[index] = subject[index];
            });
            return newSubject;
        });
        var subjectmeta = response.subjdata.map(function (subject) {
            var newMetabolites = {};
            newMetabolites[response.subjId] = subject[response.subjId];
            response.allMetabolites.forEach(function (index) {
                newMetabolites[index] = subject[index];
            });
            return newMetabolites;
        });
        $.extend(response, {
            inputDataSummary: {
                'Metabolites Sheet': response.metab.length + ' metabolites',
                'Subject data sheet': response.allSubjects.length + ' subjects with ' + response.allSubjectMetaData.length + ' covariates',
                'Subject metabolites sheet': response.subjdata.length + ' subjects with ' + (Object.keys(response.subjdata[0]).length - response.allSubjectMetaData.length - 1) + ' metabolites'
            },
            integrityChecked: true,
            log2var: response.metab.map(function (obj) {
                return obj.log2var;
            }),
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
            modelOptions: modelOptions,
            models: response.mods,
            'num.min': response.metab.map(function (obj) {
                return obj['num.min'];
            }),
            status: response.integritymessage.toLowerCase().indexOf("error") < 0,
            statusMessage: response.integritymessage,
            subjectdata: subjectdata,
            subjectmeta: subjectmeta
        });
        delete response.allMetabolites;
        delete response.allSubjectMetaData;
        delete response.allSubjects;
        delete response.integritymessage;
        delete response.mods;
        console.log(response);
        return response;
    }
//    ,
//
//    validate: function (attrs, options) {
//        var errors = [];
//
//        if (attrs.csvFile == null || attrs.csvFile == undefined) {
//            errors.push({
//                name: 'inputDataFile',
//                message: "You must upload a data file"
//            });
//        } else {
//            if (attrs.csvFile.type != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || (attrs.csvFile.name.split(".")[1] != "xlsx" || attrs.csvFile.name.split(".")[1] != "xls")) {
//                errors.push({
//                    name: 'inputDataFile',
//                    message: "Incorrect file type loaded. You must upload an excel (.xls/x) file."
//                });
//            }
//        }
//
//        if (attrs.cohort == "") {
//            errors.push({
//                name: 'cohort',
//                message: "You must select a cohort"
//            });
//        } else {
//            if (attrs.methodSelection == "Batch" && attrs.modelSelection.length === 0) {
//                errors.push({
//                    name: 'methodSelection',
//                    message: "You must select a model to process in 'Batch' mode"
//                });
//            }
//            if (attrs.methodSelection == "Interactive") {
//                if (attrs.exposure.length === 0) {
//                    errors.push({
//                        name: 'exposure',
//                        message: "You must select at least one 'Exposure' variable to process in 'Interactive' mode"
//                    });
//                }
//                if (attrs.outcome.length === 0) {
//                    errors.push({
//                        name: 'outcome',
//                        message: "You must select at least one 'Outcome' variable to process in 'Interactive' mode"
//                    });
//                }
//            }
//        }
//
//        return errors.length > 0 ? errors : false;
//    }

});

appComets.CorrelationResultsModel = Backbone.Model.extend({
    defaults: {
        correlationRun: false,
        csvFile: null,
        excorrdata: [],
        exposures: [],
        plotHeight: 500,
        sortRow: null,
        status: false,
        statusMessage: "An unknown error occurred",
        tableOrder: ["age", "age.n", "age.p", "model", "cohort", "adjvars", "metabolite_name", "hmdb_id", "rt", "m_z", "uid_01", "hmdb", "biochemical"]
    },
    url: "/cometsRest/correlate",
    parse: function (response, xhr) {
        $.extend(response, {
            correlationRun: true,
            excorrdata: response.excorrdata.map(function (biochemical) {
                return $.extend(biochemical, {
                    model: response.model
                });
            }),
            exposures: response.exposures.constructor === Array ? response.exposures : [response.exposures]
        });
        delete response.model;
        console.log(response);
        return response;
    }
//    ,
//    validate: function (attributes) {
//        errors = [];
//        if (attributes.csvFile === null || attributes.csvFile == undefined) {
//            errors.push({
//                name: "csvFile",
//                message: "You must upload a data file"
//            });
//        } else {
//            if (attributes.csvFile.type != "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
//                errors.push({
//                    name: "csvFile",
//                    message: "You must upload an excel (xks, xlsx) workbook"
//                });
//            }
//        }
//
//        return errors.length > 0 ? errors : false;
//    }
});