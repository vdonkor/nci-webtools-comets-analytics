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
    url: "/cometsRest/user_list",
    model: appAdmin.UserModel
});
