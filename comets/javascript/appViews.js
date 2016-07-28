// app namespace
var appComets = {
    models: { },
    sorts: {
        "Alphabetic (asc)": function(obj1,obj2) {
            return ((obj1.metabolite_name > obj2.metabolite_name)?1:(obj1.metabolite_name < obj2.metabolite_name)?-1:0);
        },
        "Alphabetic (desc)": function(obj1,obj2) {
            return ((obj1.metabolite_name < obj2.metabolite_name)?1:(obj1.metabolite_name > obj2.metabolite_name)?-1:0);
        },
        "default": function(property) {
            return function(obj1,obj2) {
                return obj2[property]-obj1[property];
            }
        }
    },
    views: {}
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

appComets.FormView = Backbone.View.extend({
    el: "#cometsForm",
    initialize: function () {
        // watch model for changes and trigger render
        this.model.on("change",this.render,this);
        this.model.on("change:csvFile",function () {
            if (this.get("csvFile"))
                $("#inputNotice").hide();
            else
                $("#inputNotice").show();
        });
        this.render();
    },
    events: {
        "change #inputDataFile": "uploadInputDataFile",
        "change select": "updateModel",
        "change input[type='text']": "updateModel",
        "change input[type='radio']": "updateModel",
        "click #load": "checkIntegrity",
        "click #runModel": "runModel",
        "click #toggleHelp": function () { this.$el.find("#inputHelp").toggle(); }
    },
    uploadInputDataFile: function (e) {
        //add file to model
        var file = fileUpload(e);
        this.model.set("csvFile", file);
        if (file == null || file == undefined) {
            this.$el.find("#load").attr('disabled', true);
        } else {
            this.$el.find("#load").removeAttr('disabled');
        }
    },
    updateModel: function(e) {
        var e = $(e.target);
        this.model.set(e.attr('name')||e.attr('id'),e.hasClass('selectized') ? e.val().split(',') : e.val());
    },
    checkIntegrity: function (e) {
        e.preventDefault();
        file = this.model.get("csvFile")
        if (file) {
            var $that = this;
            var formData = new FormData();
            formData.append("inputFile", file);
            appComets.models.integrityResults.fetch({
                type: "POST",
                data: formData,
                dataType: "json",
                cache: false,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $that.$el.find("#loader").addClass("show");
                    $that.$el.find("#calcProgressbar").show()
                        .find("[role='progressbar']")
                        .removeClass("progress-bar-danger progress-bar-success")
                        .addClass("active").text("Uploading....Please Wait");
                }
            }).fail(function (data) {
                $that.$el.find("#calcProgressbar [role='progressbar']").addClass("progress-bar-danger").text("Upload Failed!");
                $that.$el.find("#inputDataFile").wrap("<form></form>").closest("form")[0].reset();
                $that.$el.find("#inputDataFile").unwrap();
                if (data.responseJSON && 'status' in data.responseJSON) {
                    $.extend($that.model.attributes,{
                        status: data.responseJSON.status
                    });
                    $that.render();
                }
            }).then(function (data, statusText, xhr) {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload of '" + $that.model.get("csvFile").name + "' Complete");
                $.extend($that.model.attributes,{
                    modelList: data.models.map(function(model) { return model.model; }),
                    modelOptions: data.modelOptions,
                    status: data.status
                });
                $that.render();
            }).always(function () {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("active");
                $that.$el.find("#loader").removeClass("show");
            });
        }
    },
    runModel: function (e) {
        e.preventDefault();
        var summaryModel = new appComets.CorrelationResultsModel();
        var formData = new FormData();
        formData.append('filename',this.model.get('filename'));
        formData.append('cohortSelection',this.model.get('cohort'));
        formData.append('methodSelection',this.model.get('methodSelection'));
        if (this.model.get('methodSelection') == 'batch') {
            formData.append('modelSelection',this.model.get('modelSelection'));
        } else if (this.model.get('methodSelection') == 'interactive') {
            formData.append('modelDescription',this.model.get('modelDescription'));
            formData.append('outcome',this.model.get('outcome'));
            formData.append('exposure',this.model.get('exposure'));
            formData.append('covariates',this.model.get('covariates'));
        }
        summaryModel.fetch({
            type: "POST",
            data: formData,
            dataType: "json",
            cache: false,
            processData: false,
            contentType: false
        }).fail(function () {
        }).then(function (data, statusText, xhr) {
            summaryModel.set(data);
            this.summaryView = new appComets.SummaryView({
                model: summaryModel
            });
            this.correlateHeatmapView = new appComets.CorrelateHeatmapView({
                model: summaryModel
            });
        }).always(function () {
        });
    },
    render: function () {
        // Let's us update an options list using a templatized string instead of building one ourself or one at a time
        var optionTemplate = _.template(appComets.templatesList['harmonizationForm.options']);
        this.$el.find('#cohortSelection').html(optionTemplate({
            optionType: "Cohort",
            optionList: this.model.get("cohortList"),
            selectedOption: this.model.get("cohortSelection")
        }));
        // only if we've successfully uploaded a file, because we need that data
        if (this.model.get('status')) {
            var $that = this;
            var methodSelection = this.model.get('methodSelection');
            var modelSelection = this.model.get('modelSelection');
            this.$el.find('#analysisOptions').addClass("show");
            this.$el.find('#batch,#interactive').each(function(i, el) {
                var id = el.id;
                var state = id == methodSelection;
                $(el).toggleClass('show',state);
                $that.$el.find('input[name="methodSelection"][value="'+id+'"]').prop('checked',state);
            });
            this.$el.find('#modelSelection').html(optionTemplate({
                optionType: 'Model',
                optionList: this.model.get('modelList'),
                selectedOption: modelSelection
            }));
            this.$el.find('#modelDescription').val(this.model.get('modelDescription'));
            this.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
                $(el).selectize({
                    plugins: ['remove_button'],
                    options: $that.model.get('modelOptions')
                });
                el.selectize.setValue($that.model.get(el.id),true);
            });
            if (
                (methodSelection == 'interactive'
                    && this.model.get('outcome').length > 0 && this.model.get('exposure').length > 0) ||
                (methodSelection == 'batch' && modelSelection)
            ) {
                this.$el.find('#runModel').removeAttr('disabled');
            } else {
                this.$el.find('#runModel').attr('disabled', true);
            }
        } else {
            this.$el.find('#analysisOptions').removeClass('show');
        }
    }
});

// view for the results displayed under the integrity check tab
appComets.IntegrityView = Backbone.View.extend({
    el: "#integrityDiv",
    initialize: function () {
        this.model.on('change',this.render,this);
        if (appComets.templatesList) {
            document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";
            this.template = _.template(appComets.templatesList.integrityCheckResult);
            this.render();
        }
    },
    render: function () {
        console.log(this.model.attributes);
        if (this.model.get('integrityChecked')){
            this.$el.html(this.template(this.model.attributes));
            var log2var = this.model.get('log2var');
            var numMin = this.model.get('num.min');
            if (log2var !== null) generateHistogram('varianceDist', 'log2 Variance', "Frequency", 'Log2 Variance Distribution', log2var);
            if (numMin !== null) generateHistogram('subjectDist', 'Number at minimum', "Frequency", 'Distribution of number of subject at min', numMin);
        } else {
            this.$el.html('');
        }
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
        this.model.set(e.target.id, e.target.value);
    }
});

appComets.CorrelateHeatmapView = Backbone.View.extend({
    el: "#tab-heatmap",
    initialize: function () {
        this.model.on('change',this.render,this);
        document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";
        if (appComets.templatesList) {
            this.render();
        }
    },
    render: function () {
        this.model.set('plotHeight',Math.min(Math.max(this.model.get('plotHeight'),200),9000));
        this.template = _.template(appComets.templatesList.heatmapResult,this.model.attributes);
        this.$el.html(this.template);
        var correlationData = this.model.get('excorrdata');
        var sortRow = this.model.get('sortRow');
        correlationData = correlationData.sort((appComets.sorts[sortRow]||appComets.sorts.default(sortRow)));
        var exposures = this.model.get('exposures');
        var values = correlationData.map(function(biochem) {
            return exposures.map(function(exposure) {
              return biochem[exposure];
            });
        });
        var metaboliteNames = correlationData.map(function(biochem) {
            return biochem.metabolite_name;
        });
        generateHeatmap("correlateHeatmap", this.model.get('plotHeight'), exposures, metaboliteNames, "Correlation", values);
    },
    events: {
        "change #sortRow": "updateModel",
        "change #plotHeight": "updateModel"
    },
    updateModel: function(e) {
        var e = $(e.target);
        this.model.set(e.attr("id"),e.val());
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
            table.columns().every(function() {
                var column = this;
                $('input',this.footer()).on('keyup change',function() {
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
        var setTitle = function (e) {
            document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
        };
        $('#pageContent').on('show.bs.tab','#comets-tab-nav',setTitle);
        $('#pageContent').on('show.bs.tab','#correlate-tab-nav',setTitle);
        appComets.models.harmonizationForm = new appComets.HarmonizationFormModel();
        appComets.models.integrityResults = new appComets.IntegrityResultsModel();
        appComets.models.correlationResults = new appComets.CorrelationResultsModel();
        appComets.views.formView = new appComets.FormView({
            model: appComets.models.harmonizationForm
        });
        appComets.views.integrityView = new appComets.IntegrityView({
            model: appComets.models.integrityResults
        });
    });
});