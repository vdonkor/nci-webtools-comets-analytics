Backbone.Model.prototype.reset = function(attrs,val,options) {
    if (attrs instanceof Object) {
        if (options === undefined && val instanceof object) {
            options = val;
            val = null;
        }
    } else {
        var name = attrs;
        attrs = {};
        attrs[name] = val;
    }
    for (var name in this.attributes) {
        if (attrs[name] === undefined && this.defaults[name] === undefined) {
            this.unset(name,options);
        }
    }
    this.set(_.extend({},this.defaults,attrs),options);
    this.trigger('reset',this,options);
}

appComets.CohortsModel = Backbone.Model.extend({
    defaults: {
        cohorts: ['Other']
    },
    url: "/cometsRest/public/cohorts"
});

appComets.HeaderModel = Backbone.Model.extend({
    defaults: {
        comets: null,
        email: "",
        family_name: "",
        given_name: "",
        user_id: ""
    },
    fetch: function(options) {
        var model = this;
        return $.get(document.location).done(function(response, status, xhr) {
            var response = JSON.parse(xhr.getResponseHeader("OIDC_id_token_payload"))||{};
            model.set(model.parse(response, xhr));
        });
    },
    parse: function (response, xhr) {
        var user_metadata = response.user_metadata||{};
        user_metadata.comets = response.comets||this.defaults.comets;
        user_metadata.email = response.email;
        user_metadata.family_name = user_metadata.family_name || response.family_name || "";
        user_metadata.given_name = user_metadata.given_name || response.given_name || "";
        user_metadata.user_id = response.user_id;
        console.log(user_metadata);
        return user_metadata;
    }
});

appComets.HarmonizationFormModel = Backbone.Model.extend({
    defaults: {
        cohortList: ["Other"],
        cohortSelection: null,
        covariates: [],
        csvFile: null,
        filename: null,
        exposure: [],
        metaboliteIds: [],
        methodSelection: "Batch",
        modelDescription: "Unadjusted",
        modelList: [],
        defaultOptions: [{ 'text': "All Metabolites", 'value': "All metabolites" }],
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
        metaboliteSummary: {},
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
            metaboliteIds: response.allMetabolites.map(function(subject) { return { text: subject, value: subject }; }),
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
        csv: null,
        displayAnnotations: false,
        entryCount: 25,
        excorrdata: [],
        exposures: [],
        filterdata: [],
        page: 1,
        pageCount: 1,
        plotColorscale: "Viridis",
        plotHeight: 500,
        plotWidth: 800,
        sortRow: null,
        status: false,
        statusMessage: "An unknown error occurred",
        tableOrder: []
    },
    url: "/cometsRest/correlate",
    fetch: function(options) {
        var response = Backbone.Model.prototype.fetch.call(this,options),
            model = this;
        response.done(function(response) {
            if (options.reset) {
                model.trigger('reset',model,options);
            }
        }).fail(function(response) {
            if ('responseJSON' in response) {
                model.set({
                    correlationRun: true,
                    status: response.responseJSON.status,
                    statusMessage: response.responseJSON.statusMessage
                });
                if (options.reset) {
                    model.trigger('reset',model,options);
                }
            }
        });
        return response;
    },
    parse: function (response, xhr) {
        var excorrdata = response.excorrdata.map(function (biochemical) {
            return $.extend(biochemical, {
                model: response.model,
                selected: false
            });
        });
        var exposures = response.exposures.constructor === Array ? response.exposures : [response.exposures];
        $.extend(response, {
            clusterResults: false,
            correlationRun: true,
            displayAnnotations: false,
            excorrdata: excorrdata,
            exposures: exposures,
            filterdata: excorrdata,
            pageCount: Math.ceil(excorrdata.length/this.get('entryCount')),
            sortRow: exposures[0]
        });
        delete response.model;
        console.log(response);
        return response;
    }
});

appComets.CustomListModel = Backbone.Model.extend({
    defaults: {
        correlationModel: null,
        formModel: null,
        'listName': "custom",
        'metaboliteList': []
    }
});