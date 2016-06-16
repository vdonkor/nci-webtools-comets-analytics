appComets.authUser = Backbone.Model.extend({
    defaults: {
        authStatus: null,
        user: null,
        token: null
    },
    localStorage: new Store('user-auth')
});

appComets.qcCheck = Backbone.Model.extend({
    defaults: {
        harmFile: null,
        refMapFile: null,
        results: null
    },
});

appComets.harmCheck = Backbone.Model.extend({
    defaults: {
        metaNamesFile: null,
        results: null
    }
});

appComets.correlate = Backbone.Model.extend({
    defaults: {
        cohort: null,
        dataFile: null,
        method: null,
        modelSelect: null
    },
    urlRoot:"/correlate"
});


/** 
    need the integrity object and its properties in order to generate template
                    
    integrity.status
    integrity.metaboliteSheet.meta
    integrity.subjectSheet.subjects
    integrity.subjectSheet.covariants
    integrity.subjectMetasheet.meta
    integrity.nMetabolites
    integrity.nHarmonized
    integrity.nHarmonizedNon
    integrity.graph.src
    integrity.graph.description
    integrity.dateRun
**/
appComets.fileStats = Backbone.Model.extend({
    integrity: {
        status: null,
        metaboliteSheet: {
            meta: null
        },
        subjectSheet: {
            subjects: null,
            covariants: null
        },
        subjectMetaSheet: {
            subjects: null,
            meta: null
        },
        nMetabolites: null,
        nHarmonized: null,
        nHarmonizedNon: null,
        graph: {
            src: null,
            description: null
        },
        dateRun: null
    }
});