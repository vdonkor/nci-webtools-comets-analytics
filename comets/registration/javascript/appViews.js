var appRegistration = {};

appRegistration.FormView = Backbone.View.extend({
    el: "#registration",
    initialize: function () {
        // watch model for changes and trigger render
        var view = this;
        this.cohortsModel = new appRegistration.CohortsModel();
        this.template = appRegistration.template;
        // no way to do this in the proper order, due to the need to assign the variable
        this.after = _.after(2,function() {
            view.model.set('cohortList',view.cohortsModel.get('cohorts'));
            view.render.apply(view);
        });
        this.model.on({
            'change:email': this.updateButton,
            'change:family_name': this.updateButton,
            'change:given_name': this.updateButton,
            'change:affiliation': this.updateButton
        }, this);
        this.cohortsModel.on('change', this.after, this);
        this.model.fetch().then(this.after);
        this.cohortsModel.fetch();
    },
    events: {
        'change select': 'updateModel',
        'change input:not([type="button"])': 'updateModel',
        'keypress input:not([type="button"])': 'noSubmit',
        'click #submit': 'register'
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
    register: function(e) {
        e.preventDefault();
        var view = this;
        this.$el.find('input').attr('disabled',true);
        this.model.save(null).done(function() {
            setTimeout(function() {
                window.location = '../';
            }, 6000);
        });
    },
    render: function(e) {
        this.$el.html(this.template(this.model.attributes));
    },
    updateButton: function(e) {
        var attrs = this.model.attributes;
        var submit = this.$el.find('#submit');
        if (this.model.get('affiliation') === "" || this.model.get('cohort') === "" || this.model.get('family_name') === "" || this.model.get('given_name') === "") {
            submit.attr("disabled",true);
        } else {
            submit.removeAttr('disabled');
        }
    }
});
$(function() {
    $.get('templates/registration.html').done(function(data) {
        appRegistration.template = _.template(data);
    }).always(function() {
        new appRegistration.FormView({
            model: new appRegistration.FormModel()
        });
    });
});
