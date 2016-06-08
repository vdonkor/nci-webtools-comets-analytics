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
    }
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
    }
});

