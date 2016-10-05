appRegistration.CohortsModel = Backbone.Model.extend({
    defaults: {
        cohorts: ['Other']
    },
    url: "/cometsRest/public/cohorts"
});
appRegistration.FormModel = Backbone.Model.extend({
    defaults: {
        affiliation: "",
        cohort: "",
        cohortList: ["Other"],
        comets: null,
        email: "",
        family_name: "",
        given_name: "",
        registered: false,
        user_id: ""
    },
    url: "/cometsRest/registration/user_metadata",
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
        user_metadata.user_id = encodeURIComponent(response.user_id);
        console.log(user_metadata);
        return user_metadata;
    }
});
