// app namespace
var appComets = {
    sorts: {
        "Alphabetic (asc)": function (obj1, obj2) {
            return ((obj1.metabolite_name > obj2.metabolite_name) ? 1 : (obj1.metabolite_name < obj2.metabolite_name) ? -1 : 0);
        },
        "Alphabetic (desc)": function (obj1, obj2) {
            return ((obj1.metabolite_name < obj2.metabolite_name) ? 1 : (obj1.metabolite_name > obj2.metabolite_name) ? -1 : 0);
        },
        "default": function (property) {
            return function (obj1, obj2) {
                return obj2[property] - obj1[property];
            }
        }
    }
};

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

appComets.LandingView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        var baseView = this;
        //holds all the possible result pieces
        this.resultModel = new appComets.IntegrityResultsModel();

        //subviews

        this.correlateView = new appComets.CorrelateView({
            model: this.resultModel
        });
        this.formView = new appComets.FormView({
            el: this.$el.find("#cometsForm"),
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
        view.model.on('change', view.render);

        view.render();
    },
    events: {
        "change #inputDataFile": 'uploadInputDataFile',
        "click #load": "checkIntegrity",
        "click #runModel": "runModel",
        "change [name='methodSelection']": "analysisMethod",
        "change #cohortSelection": "cohortSelect",
        "change #modelDescription": "getDescription",
        "change #modelSelection": "modelSelect",
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

        if (file == null || file == undefined) {
            view.$el.find("#load").attr('disabled', true);
        } else {
            view.$el.find("#load").removeAttr('disabled');
        }
    },
    checkIntegrity: function (e) {
        e.preventDefault();

        file = view.model.get("csvFile");
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
                    view.$el.find("#loader").addClass("show");
                    view.$el.find("#calcProgressbar")
                        .show()
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

                _.each(view.$el.find('#outcome, #exposure, #covariates'), function (control, ind) {
                    control.selectize.addOption({
                        text: 'All Metabolites',
                        value: 'All metabolites'
                    });
                    control.selectize.addOption(results);
                    control.selectize.refreshOptions();

                    if (control.id == "outcome") {
                        control.selectize.setValue("All metabolites");
                    }
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
                view.$el.find("#loader").removeClass("show");
            });
        }
    },
    runModel: function (e) {
        e.preventDefault();
        var summaryModel = new appComets.CorrelationResultsModel();
        var formData = new FormData();

        formData.append('filename',view.model.get('filename'));
        formData.append('cohortSelection',view.model.get('cohort'));
        formData.append('methodSelection',view.model.get('methodSelection'));
        formData.append('modelSelection',view.model.get('modelSelection'));
        formData.append('modelDescription',view.model.get('modelDescription'));
        formData.append('outcome',JSON.stringify(view.model.get('outcome')));
        formData.append('exposure',JSON.stringify(view.model.get('exposure')));
        formData.append('covariates',JSON.stringify(view.model.get('covariates')));
        if (view.model.get('methodSelection') == 'Batch') {
            formData.append('modelName',view.model.get('modelSelection'));
        } else if (view.model.get('methodSelection') == 'Interactive') {
            formData.append('modelName',view.model.get('modelDescription'));
        }
        summaryModel.fetch({
            type: "POST",
            data: formData,
            dataType: "json",
            cache: false,
            processData: false,
            contentType: false,
            beforeSend: function () {
                view.$el.find("#loader").addClass("show");
            }
        }).fail(function () {}).then(function (data, statusText, xhr) {
            summaryModel.set(data);
            view.summaryView = new appComets.SummaryView({
                model: summaryModel
            });
            view.correlateHeatmapView = new appComets.CorrelateHeatmapView({
                model: summaryModel
            });
        }).always(function () {

            view.$el.find("#loader").removeClass("show");
        });
    },
    analysisMethod: function (e) {
        console.log(e);
        console.log(e.target.value);
        view.model.set('methodSelection', e.target.value);
        console.log(view.model.get('methodSelection'));
        if (e.target.value == "Batch") {
            view.$el.find("#batch").show();
            view.$el.find("#interactive").hide();
        } else {
            view.$el.find("#interactive").show();
            view.$el.find("#batch").hide();
        }
    },
    cohortSelect: function (e) {
        view.model.set('cohort', e.target.value);

    },
    modelSelect: function (e) {
        view.model.set('modelSelection', e.target.value);
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
    },
    render: function () {
        if (view.model) {
            var interactiveOptionsCount = view.model.get("outcome").length + view.model.get("exposure").length + view.model.get("covariates").length;

            view.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
                $(el).selectize({
                    plugins: ["remove_button"],
                });
            });

            view.$el.find("#" + view.model.get("methodSelection").toLowerCase()).show();
            view.model.set("modelSelection", view.$el.find("#modelSelection").val());

            if (view.model.get("methodSelection") == "Batch") {
                view.model.set("modelSelection", view.$el.find("#modelSelection").val());
            } else
                view.model.set("modelSelection", view.model.defaults.modelSelection);
            
            if(view.$el.find("#modelDescription").val().length === 0){
                view.$el.find("#modelDescription").val(view.model.defaults.modelDescription);
            }

            if (view.model.get("cohort"))
                view.$el.find("#runModel").removeAttr("disabled");
            else
                view.$el.find("#runModel").attr("disabled", true);
        }
    }
});

// view for the results displayed under the integrity check tab
appComets.IntegrityView = Backbone.View.extend({
    el: "#integrityDiv",
    initialize: function () {
        var view = this;
        if (view.model) {

            if (appComets.templatesList) {
                document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";

                view.template = _.template(appComets.templatesList.integrityCheckResult, {

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

                view.render();
            }
        }
    },
    render: function () {
        this.$el.html(this.template);
        var data = view.model.get('metab');
        generateHistogram('varianceDist', 'log2 Variance', "Frequency", 'Log2 Variance Distribution', data.map(function (obj) {
            return obj.log2var;
        }));
        generateHistogram('subjectDist', 'Number at minimum', "Frequency", 'Distribution of number of subject at min', data.map(function (obj) {
            return obj['num.min'];
        }));
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
});

appComets.CorrelateView = Backbone.View.extend({
    el: "#tab-correlate",
    initialize: function () {
        baseView = this;
        this.model.on("change:methodSelection", function () {

            /**
                watch the methodSelection attribute in the model for changes. 
                Toggle the visibility of the batch and interactive controls. 
                The controls being hidden will have its data reset to its default in the model 
            **/

            switch (this.get("methodSelection")) {

            case "Batch":
                baseView.$el.find("#batch").show();
                baseView.$el.find("#interactive").hide();
                this.set("Interactive", this.defaults.Interactive);
                this.set("modelDescription", this.defaults.modelDescription);
                this.set("outcome", this.defaults.outcome);
                this.set("exposure", this.defaults.exposure);
                this.set("covariates", this.defaults.covariates);
                break;
            case "Interactive":
                baseView.$el.find("#batch").hide();
                baseView.$el.find("#interactive").show();
                this.set("Batch", this.defaults.Batch);
                this.set("modelSelection", this.defaults.modelSelection)
                break;
            default:
                baseView.$el.find("#batch,#interactive").hide();
                this.set("Batch", this.defaults.Batch);
                this.set("Interactive", this.defaults.Interactive);
                break;
            }
        });

        this.model.on("change:csvFile", function () {

            if (this.get("csvFile"))
                baseView.$el.find("#inputNotice").hide();
            else
                baseView.$el.find("#inputNotice").show();
        });
    }
});

appComets.CorrelateHeatmapView = Backbone.View.extend({
    el: "#tab-heatmap",
    initialize: function () {
        this.model.on('change', this.render, this);
        document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";
        if (appComets.templatesList) {
            this.render();
        }
    },
    render: function () {
        this.model.set('plotHeight', Math.min(Math.max(this.model.get('plotHeight'), 200), 9000));
        this.template = _.template(appComets.templatesList.heatmapResult, this.model.attributes);
        this.$el.html(this.template);
        var correlationData = this.model.get('excorrdata');
        var sortRow = this.model.get('sortRow');
        correlationData = correlationData.sort((appComets.sorts[sortRow] || appComets.sorts.default(sortRow)));
        var exposures = this.model.get('exposures');
        var values = correlationData.map(function (biochem) {
            return exposures.map(function (exposure) {
                return biochem[exposure];
            });
        });
        var metaboliteNames = correlationData.map(function (biochem) {
            return biochem.metabolite_name;
        });
        generateHeatmap("correlateHeatmap", this.model.get('plotHeight'), exposures, metaboliteNames, "Correlation", values);
    },
    events: {
        "change #sortRow": "updateView",
        "change #plotHeight": "updateView"
    },
    updateView: function (e) {
        var e = $(e.target);
        this.model.set(e.attr("id"), e.val());
    }
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

// view the run model summary
appComets.SummaryView = Backbone.View.extend({
    el: "#tab-summary",
    initialize: function () {
        var view = this;
        if (appComets.templatesList) {
            view.template = _.template(appComets.templatesList.correlationResult, view.model.attributes);
            view.render();
            var table = $('#correlationSummary table').DataTable({
                pageLength: 25
            });
            table.columns().every(function () {
                var column = this;
                $('input', this.footer()).on('keyup change', function () {
                    if (column.search() !== this.value)
                        column
                        .search(this.value)
                        .draw();
                });
            });
        }
    },
    render: function () {
        this.$el.html(this.template);
    }
});

// view for the heatmap

// view for the "cluster and heatmap"

// view for "network"

$(function () {
    templates = $.ajax({
        type: "GET",
        url: "/cometsRest/templates",
    }).then(function (data) {
        // attach templates array to module
        appComets.templatesList = data;
    }).done(function () {
        var baseView = new appComets.LandingView();
    });
});
