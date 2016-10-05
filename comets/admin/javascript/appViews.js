var appAdmin = {};

appAdmin.UserTableView = Backbone.View.extend({
    el: "#userTable",
    initialize: function () {
        this.model.on('reset', this.render, this);
        this.model.fetch({reset: true});
    },
    events: {
        'change select': 'updateModel',
        'change input:not([type="button"])': 'updateModel',
        'keypress input:not([type="button"])': 'noSubmit'
    },
    noSubmit: function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            return false;
        }
    },
    updateModel: function(e) {
        var e = $(e.target);
        if (e.attr('type') == 'checkbox') {
            this.model.set(e.attr('name') || e.attr('id'), e.prop('checked'));
        } else {
            this.model.set(e.attr('name') || e.attr('id'), !e.hasClass('selectized') ? e.val() : e.val().length > 0 ? e.val().split(',') : []);
        }
    },
    render: function() {
        this.$el.DataTable({
            data: this.model.models.map(function(model) {
                return model.attributes;
            }),
            columns: [
                { title: "Email", data: 'email' },
                { title: "Given Name", data: 'user_metadata.given_name' },
                { title: "Family Name", data: 'user_metadata.family_name' },
                { title: "Affiliation", data: 'user_metadata.affiliation' },
                { title: "Cohort", data: 'user_metadata.cohort' },
                { title: "Status", data: 'app_metadata.comets' }
            ]
        });
    }
});
$(function() {
    new appAdmin.UserTableView({
        model: new appAdmin.UserCollection()
    })
    $('#logoutBtn').on('click', function (e) {
        e.preventDefault();
        var path = window.location.href;
        window.location = "/auth0_redirect?logout=" + encodeURIComponent(path.substring(0,path.lastIndexOf('/'))+"/public/logout.html");
    });
});
