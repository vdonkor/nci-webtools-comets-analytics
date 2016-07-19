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

appComets.LandingView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        //holds all the possible result pieces
        this.resultModel = new appComets.ResultsModel();

        this.landingTitle = new appComets.HeaderView();

        //subview
        this.correlateView = new appComets.CorrelateView({
            el: this.$el.find("#tab-correlate"),
            model: this.resultModel
        });

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

appComets.FormView = Backbone.View.extend({
    tagName: "form",
    initialize: function () {
        view = this;
        // watch model for changes and trigger render
        view.model.on('change', this.render);

        view.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
            $(el).selectize({
                plugins: ["remove_button"]
            });
        });
    },
    render: function () {
        if (view.model) {
            var interactiveOptionsCount = view.model.get("outcome").length + view.model.get("exposure").length + view.model.get("covariates").length;

            if (
                ( view.model.get("methodSelection") == "interactive" && interactiveOptionsCount > 0 ) ||
                ( view.model.get("methodSelection") == "batch" && view.model.get("batch") )
            ) {
                view.$el.find("#runModel").removeAttr('disabled');
            } 
            else
                view.$el.find("#runModel").attr('disabled', true);
            
            if(view.model.get("batch") == true)
                view.model.set("modelSelection", view.$el.find("#modelSelection").val());
            else
                view.model.set("modelSelection", view.model.defaults.modelSelection);

            if (view.model.get('csvFile') === null || view.model.get('csvFile') === undefined) {
                view.$el.find("#calcProgressbar").hide();
                view.$el.find("#load").attr('disabled', true);
            } else {
                view.$el.find("#load").removeAttr('disabled');
            }
        }
    },
    events: {
        "change #inputDataFile": 'uploadInputDataFile',
        "click #load": "processFile",
        "change [name='methodSelection']": "analysisMethod",
        "change #cohortSelection": "cohortSelect",
        "change #modelDescription": "getDescription",
        "change #outcome": "updateOptions",
        "change #exposure": "updateOptions",
        "change #covariates": "updateOptions",
        "click #toggleHelp": function () {
            this.$el.find("#inputHelp").toggle();
        }
    },
    uploadInputDataFile: function (e) {
        //add file to model
        var file = fileUpload(e);
        this.model.set("csvFile", file);
    },
    processFile: function (e) {
        e.preventDefault();
        file = view.model.get("csvFile")
        if (file) {
            var formData = new FormData();
            formData.append("inputFile", file);

            view.model.fetch({
                type: "POST",
                data: formData,
                dataType: "json",
                cache: false,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    view.$el.find("#calcProgressbar").show()
                        .find("[role='progressbar']")
                        .removeClass("progress-bar-danger progress-bar-success")
                        .addClass("active").text("Uploading....Please Wait");
                }
            }).fail(function () {
                view.$el.find("#calcProgressbar [role='progressbar']").addClass("progress-bar-danger").text("Upload Failed!");
                view.$el.find("#inputDataFile").wrap("<form></form>").closest("form")[0].reset();
                view.$el.find("#inputDataFile").unwrap();
            }).then(function (data, statusText, xhr) {
                view.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload of '" + view.model.get("csvFile").name + "' Complete");

                view.model.set(data);

                // retrieve the array of options
                results = view.model.get('subjectOptions');

                _.each(view.$el.find('#outcome, #exposure, #covariates'), function (control) {
                    control.selectize.addOption(results);
                    control.selectize.refreshOptions();
                });

                // subviews
                view.integrityView = new appComets.IntegrityView({
                    model: view.model
                });

                view.modelOptionsView = new appComets.ModelSelectionOptions({
                    modelsOptions: view.model.get("models")
                });

                view.$el.find('#analysisOptions').show();
            }).always(function () {
                view.$el.find("#calcProgressbar [role='progressbar']").removeClass("active");
            });
        }
    },
    analysisMethod: function (e) {
        view.model.set('methodSelection', e.target.value);
        var newVal = view.model.get('methodSelection');
    },
    cohortSelect: function (e) {
        view.model.set('cohort', e.target.value);
    },
    updateOptions: function (e) {
        var selectedOptions = e.target.value;

        if (selectedOptions.length > 0)
            selectedOptions = selectedOptions.split(",");
        else
            selectedOptions = view.model.defaults[e.target.id];

        var inputs = view.model.set(e.target.id, selectedOptions);
    },
    getDescription: function (e) {
        view.model.set('modelDescription', e.target.value);
    }
});

appComets.CorrelateView = Backbone.View.extend({
    initialize: function () {
        baseView = this;
        this.model.on("change:methodSelection", function () {
            /**
                watch the methodSelection attribute in the model for changes. 
                Toggle the visibility of the batch and interactive controls. 
                The controls being hidden will have its data reset to its default in the model 
            **/
            switch (this.get("methodSelection")) {
            case "batch":
                baseView.$el.find("#batch").show();
                baseView.$el.find("#interactive").hide();
                this.set("interactive", this.defaults.interactive);
                this.set("modelDescription", this.defaults.modelDescription);
                this.set("outcome", this.defaults.outcome);
                this.set("exposure", this.defaults.exposure);
                this.set("covariates", this.defaults.covariates);
                break;
            case "interactive":
                baseView.$el.find("#batch").hide();
                baseView.$el.find("#interactive").show();
                this.set("batch", this.defaults.batch);
                this.set("modelSelection", this.defaults.modelSelection)
                break;
            default:
                baseView.$el.find("#batch,#interactive").hide();
                this.set("batch", this.defaults.batch);
                this.set("interactive", this.defaults.interactive);
                break;
            }
        });

        this.model.on("change:csvFile", function () {
            if (this.get("csvFile"))
                baseView.$el.find("#inputNotice").hide();
            else
                baseView.$el.find("#inputNotice").show();
        });

        //subview
        baseView.formView = new appComets.FormView({
            el: baseView.$el.find("#cometsForm"),
            model: this.model
        });

    }
});
// view for the results displayed under the integrity check tab
appComets.IntegrityView = Backbone.View.extend({
    el: "#integrityDiv",
    initialize: function () {
        var view = this;
        if (view.model) {
            getTemplate('integrityCheckResult').then(function (templ) {
                if (templ.length > 0) {
                    document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";

                    view.template = _.template(templ, {
                        status: view.model.get('status'),
                        statusMessage: view.model.get('integritymessage'),
                        metabolites: view.model.get('metab'),
                        metaboliteId: view.model.get('metabId'),
                        subject: view.model.get('subjectdata'),
                        subjectMeta: view.model.get('subjectmeta'),
                        varMap: view.model.get('varmap'),
                        dateRun: view.model.get('dateRun'),
                        summary: view.model.get('integrityCheck')
                    });
                }
                view.render();
            });
        }
    },
    render: function () {
        this.$el.html(this.template);
        //        this.generateBarPlots();
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
            view.model.set(e.target.id, e.target.value);
        }
        //  ,
        //    generateBarPlots: function () {
        //        var varianceGraphContainer = this.$el.find("#varianceDist");
        //        var subjectGraphContainer = this.$el.find("#subjectDist");
        //
        //        Plotly.plot(varianceGraphContainer, [{
        //                type: "bar",
        //                title: "Log2 Variance Distribution",
        //                x: [],
        //                y: []
        //        },
        //            {
        //                yaxis: {
        //                    title: "Frequency",
        //                },
        //                xaxis: {
        //                    title: 'log2 Variance'
        //                },
        //        }]);

    //        Plotly.plot(subjectGraphContainer, [{
    //                type: "bar",
    //                title: "Distribution of number of subjects at min value",
    //                x: [],
    //                y: []
    //            },
    //            {
    //                yaxis: {
    //                    title: "Frequency",
    //                },
    //                xaxis: {
    //                    title: 'number at minimum value'
    //                },
    //            }                                 
    //        ]);
    //    }
});

// the view to populate the options for the 'Choose Model' select control
appComets.ModelSelectionOptions = Backbone.View.extend({
    el: "#modelSelection",
    tagName: "select",
    initialize: function () {
        if (this.options.modelsOptions) {
            this.template = _.template("<% _.each(modelsOptions, function(modelOpt){ %><option value='<%= modelOpt.model %>'><%= modelOpt.model %></option><% }) %>", this.options);
            this.render();
        }
    },
    render: function () {
        this.$el.html(this.template);
    }
});