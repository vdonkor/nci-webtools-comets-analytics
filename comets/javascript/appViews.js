// app namespace
var appComets = {};

appComets.ErrorsView = Backbone.View.extend({
    el: '#messageDiv',
    initialize: function () {
        if (this.options.errors && this.options.errors.length > 0) {
            var messages = this.options.errors.join("<br/>");
            this.template = _.template(messages);
            this.render();
        }
    },
    render: function () {
        if (this.template) {
            this.$el.html("<div class='alert alert-danger'>" + this.template() + "</div>");
        } else {
            this.$el.html("");
            this.$el.hide();
        }
    }
});

appComets.HeaderView = Backbone.View.extend({
    el: "#page-head",
    initialize: function () {
        if (this.options.user) {
            this.template = _.template("<%= user %>, Welcome to the COMETS (COnsortium of METabolomics Studies) Analytics", this.options);
            this.render();
        }
    },
    render: function () {
        this.$el.html(this.template);
    },
});

appComets.FormView = Backbone.View.extend({
    el: "#cometsForm",
    tagName: "form",
    initialize: function () {
        // get the current view object
        $this = this;

        // watch model for changes and trigger render
        $this.model.on('change', this.render);
    },
    render: function () {
        if ($this.model) {
            // retrieve the array of options
            results = $this.model.get('subjectOptions');

            _.each($this.$el.find('#outcome, #exposure, #covariates'), function (control) {
                $this.$el.find(control).selectize({
                    plugins: ["remove_button"],
                    options: results
                });
            });

            $('#analysisOptions').show();
        }
    },
    events: {
        "change #inputDataFile": 'uploadInputDataFile',
        "change [name='methodSelection']": "analysisMethod",
        "change #cohortSelection": "cohortSelect",
        "change #modelDescription": "getDescription",
        "change #outcome": "updateOptions",
        "change #exposure": "updateOptions",
        "change #covariates": "updateOptions",
        "click #toggleHelp": function () {
            $this.$el.find("#inputHelp").toggle();
        }
    },
    uploadInputDataFile: function (e) {
        var formData = new FormData();

        var file = fileUpload(e);
//        var inputData = this.model.get('input');
//        // check if model has data
//        if (!$.isEmptyObject(inputData)) {
//
//            _.each(inputData, function (value, key) {
//                formData.append(key, value);
//            });
//        }

        // check if file object exists
        if (file) {
            formData.append("inputFile", file);

            if ($this.model) {
                $this.model.fetch({
                    type: "POST",
                    data: formData,
                    dataType: "json",
                    cache: false,
                    processData: false,
                    contentType: false,
                    beforeSend: function () {
                        $this.$el.find("#calcProgressbar").show().find("[role='progressbar']").addClass("active");
                    }
                }).fail(function () {
                    $this.$el.find("#calcProgressbar [role='progressbar']").addClass("progress-bar-danger").text("Upload Failed!");
                    $this.$el.find("#inputDataFile").wrap("<form></form>").closest("form")[0].reset();
                    $this.$el.find("#inputDataFile").unwrap();
                }).then(function (data, statusText, xhr) {
                    $this.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload Complete");

                }).always(function () {
                    $this.$el.find("#calcProgressbar [role='progressbar']").removeClass("active");
                });
            }
        }
    },
    analysisMethod: function (e) {
        $this.model.set('methodSelect', e.target.value);
        var newVal = $this.model.get('methodSelect');

        $this.$el.find("#" + newVal).show();

        if (newVal == "batch") {
            $this.$el.find("#interactive").hide();
        } else {
            $this.$el.find("#batch").hide();
        }
    },
    cohortSelect: function (e) {
        $this.model.set('cohort', e.target.value);
    },
    updateOptions: function (e) {
        var inputs = $this.model.set(e.target.id, e.target.value.split(","));
    },
    getDescription: function (e) {
        $this.model.set('modelDescription',  e.target.value);
    }
});

appComets.LandingView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        //holds all the possible result pieces
        this.resultModel = new appComets.ResultsModel();
        
        this.landingTitle = new appComets.HeaderView();

        this.formView = new appComets.FormView({
            model: this.resultModel
        });

        //        this.integrityView = new appComets.IntegrityView({
        //            model: this.resultsModel
        //        });
    },
    events: {
        /**
            "<eventType targetedElement>" : "callbackFunctionName"
        **/
        'show.bs.tab #comets-tab-nav': 'setTitle',
        'show.bs.tab #correlate-tab-nav': 'setTitle',
    },
    setTitle: function (e) {
        document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
    }
});

// view for the results displayed under the integrity check tab
appComets.IntegrityView = Backbone.View.extend({
    el: "#integrityDiv",
    initialize: function () {
        var $this = this;
        if ($this.model) {
            getTemplate('integrityCheckResult').then(function (templ) {
                if (templ.length > 0) {
                    document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";

                    $this.template = _.template(templ, {
                        status: init.model.get('status'),
                        statusMessage: init.model.get('statusMessage'),
                        metabolite: init.model.get('metabolite'),
                        subject: init.model.get('subject'),
                        subjectMeta: init.model.get('subjectMeta'),
                        graph: init.model.get('graph'),
                        dateRun: init.model.get('dateRun')
                    });
                }
                init.render();
            });
        }
    },
    render: function () {
        if ($this.template.length > 0)
            $this.$el.html(this.template);
    },
    events: {
        "click #resultsDownload": 'startDownload',
        'change #corr_cutoff': 'updateCorrelation'
    },
    startDownload: function (e) {
        alert("starting download");
    },
    updateCorrelation: function (e) {
        $("#corr_val").val(e.target.value);
        $this.model.set(e.target.id, e.target.value);
    }
});

// the view to populate the options for the 'Choose Model' select control
appComets.ModelSelectionOptions = Backbone.View.extend({
    el: "#modelSelection",
    tagName: "select",
    initialize: function () {
        if (this.options.models) {
            this.template = _.template(this.options.models);
        }
    },
    render: function () {}

});