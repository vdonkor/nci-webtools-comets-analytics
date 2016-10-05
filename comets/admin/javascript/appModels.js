appAdmin.UserModel = Backbone.Model.extend({
    defaults: {
        app_metadata: {
            comets: null
        },
        email: "",
        user_id: "",
        user_metadata: {
            affiliation: null,
            cohort: null,
            family_name: null,
            given_name: null
        }
    },
    parse: function(response) {
        var parsedResponse = { app_metadata: {} };
        parsedResponse.app_metadata.comets = (response.app_metadata||{}).comets||null;
        parsedResponse.email = response.email;
        parsedResponse.user_id = response.user_id;
        var metadata = response.user_metadata || {};
        var new_metadata = {};
        new_metadata.affiliation = metadata.affiliation || "";
        new_metadata.cohort = metadata.cohort || "";
        new_metadata.family_name = metadata.family_name || response.family_name || "";
        new_metadata.given_name = metadata.given_name || response.given_name || "";
        parsedResponse.user_metadata = new_metadata;
        return parsedResponse;
    }
});
appAdmin.UserCollection = Backbone.Collection.extend({
    url: "/cometsRest/admin/users",
    model: appAdmin.UserModel,
    parse: function(response) {
        return response.user_list;
    },
    sync: function(method,collection,options) {
        if (collection === undefined) collection = this;
        if (method.toLowerCase() == 'patch') {
            var temp = new (Backbone.Collection.extend({
                url:  collection.url
            }))();
            for (var index in collection.models) {
                var model = collection.models[index];
                if(model.hasChanged()) temp.add(model);
            }
            return Backbone.sync.apply(temp,['patch',temp,options]);
        } else {
            return Backbone.sync.apply(this,[method,collection,options]);
        }
    }
});
appAdmin.UserTableModel = Backbone.Model.extend({
    defaults: {
        showDenied: false,
        showInactive: false
    }
});
