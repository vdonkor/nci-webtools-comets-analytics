appComets.ResultsModel = Backbone.Model.extend({
    defaults: {
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
        dateRun: new Date(),
        subjectOptions: [],
        cohortSelection: "",
        methodSelection: null,
        modelSelection: [],
        modelDescription: "",
        outcome:[],
        exposure: [],
        covariates: []
    },
    urlRoot: "/cometsRest/correlate/integrity",
    parse: function (response, xhr) {
        // options need to be array of objects for selectize plugin
        options = [];
        _.each(Object.keys(response.subjectdata[0]).concat(Object.keys(response.subjectmeta[0])), function (subject) {
            options.push({
                text: subject,
                value: subject
            });
        });

        this.set('subjectOptions', options);
    }
});