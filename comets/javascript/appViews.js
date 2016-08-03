// app namespace
var appComets = {
    events: {
        reauthenticate: function (e) {
            var newWindow = window.open("reauth.html");
            window.reauthCallback = function() {
                delete window.reauthCallback;
                $(e.target).trigger(e.type);
            };
        }
    },
    models: { },
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
        "change input:not([type='button'])": "updateModel",
        "keypress input:not([type='button'])": "noSubmit",
        "click #load": "checkIntegrity",
        "click #runModel": "runModel",
        "click #toggleHelp": function () { this.$el.find("#inputHelp").toggle(); }
    },
    noSubmit: function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            return false;
        }
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
        if (e.attr('type') == 'checkbox') {
            this.model.set(e.attr('name')||e.attr('id'),e.prop('checked'));
        } else {
            this.model.set(e.attr('name')||e.attr('id'),!e.hasClass('selectized') ? e.val() : e.val().length > 0 ? e.val().split(',') : []);
        }
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
                var response = data.responseJSON,
                    integrityResults = appComets.models.integrityResults,
                    correlationResults = appComets.models.correlationResults;
                if (response && 'status' in response) {
                    $that.model.set($.extend($that.model.attributes,{ status: response.status }));
                    console.log(this);
                    integrityResults.set($.extend(integrityResults.attributes,{
                        csv: null,
                        integrityChecked: true,
                        status: response.status,
                        statusMessage: response.integritymessage
                    }));
                    correlationResults.set($.extend(correlationResults.attributes, { correlationRun: false }));
                    $('[href="#tab-integrity"]').trigger('click');
                }
                if (data.status === 401) {
                    appComets.events.reauthenticate(e);
                }
            }).then(function (data, statusText, xhr) {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload of '" + $that.model.get("csvFile").name + "' Complete");
                $that.model.set($.extend({},$that.model.attributes,$that.model.defaults,{
                    csvFile: $that.model.get('csvFile'),
                    filename: data.filename,
                    metaboliteIds: data.metaboliteIds,
                    modelList: data.models.map(function(model) { return model.model; }),
                    modelOptions: data.modelOptions,
                    status: data.status,
                    subjectIds: data.subjectIds
                }));
                $('[href="#tab-integrity"]').trigger('click');
            }).always(function () {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("active");
                $that.$el.find("#loader").removeClass("show");
            });
        }
    },
    runModel: function (e) {
        e.preventDefault();
        var $that = this;
        var formData = new FormData();
        var toAppend = {
            'filename': this.model.get('filename'),
            'cohortSelection': this.model.get('cohortSelection'),
            'methodSelection': this.model.get('methodSelection'),
            'modelSelection': this.model.get('modelSelection'),
            'modelDescription': this.model.get('modelDescription'),
            'outcome': JSON.stringify(this.model.get('outcome')),
            'exposure': JSON.stringify(this.model.get('exposure')),
            'covariates': JSON.stringify(this.model.get('covariates')),
            'modelName': this.model.get('methodSelection') == 'Batch' ? this.model.get('modelSelection') : this.model.get('modelDescription')
        }
        for (var key in toAppend) {
            formData.append(key,toAppend[key]);
        }
        appComets.models.correlationResults.fetch({
            type: "POST",
            data: formData,
            dataType: "json",
            cache: false,
            processData: false,
            contentType: false,
            beforeSend: function () {
                $that.$el.find("#loader").addClass("show");
            }
        }).fail(function (data) {
            var response = data.responseJSON,
                correlationResults = appComets.models.correlationResults;
            if (response && 'status' in response) {
                correlationResults.set($.extend(correlationResults.attributes,{
                    modelRun: true,
                    status: response.status,
                    statusMessage: response.statusMessage
                }));
                $('[href="#tab-summary"]').trigger('click');
            }
            if (data.status === 401) {
                appComets.events.reauthenticate(e);
            }
        }).always(function () {
            $that.$el.find("#loader").removeClass("show");
            $('[href="#tab-summary"]').trigger('click');
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
            var $that = this,
                methodSelection = this.model.get('methodSelection'),
                modelSelection = this.model.get('modelSelection'),
                showMetabolites = this.model.get('showMetabolites');
            this.$el.find('#analysisOptions').addClass("show");
            this.$el.find('#Batch,#Interactive').each(function(i, el) {
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
            this.$el.find('#showMetabolites').prop('checked',showMetabolites);
            var modelOptions = [{ text: 'All Metabolites', value: 'All metabolites' }].concat(this.model.get('subjectIds'));
            if (showMetabolites) modelOptions = modelOptions.concat(this.model.get('metaboliteIds'));
            this.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
                $(el).selectize({
                    plugins: ['remove_button'],
                    options: modelOptions
                });
                el.selectize.setValue($that.model.get(el.id),true);
            });
            if (this.model.get('cohortSelection') &&
                    ((methodSelection == 'Interactive'
                        && this.model.get('outcome').length > 0 && this.model.get('exposure').length > 0) ||
                    (methodSelection == 'Batch' && modelSelection))
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

// view for the integrity check's results
appComets.IntegrityView = Backbone.View.extend({
    el: "#integrityDiv",
    initialize: function () {
        this.model.on('change',this.render,this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.integrityCheckResult);
            this.render();
        }
    },
    events: {
        "click .download": 'startDownload'
    },
    startDownload: function (e) {
        e.preventDefault();
        alert("starting download");
    },
    render: function () {
        if (this.model.get('integrityChecked')){
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status')) {
                generateHistogram('varianceDist', 'log2 Variance', "Frequency", 'Log2 Variance Distribution', this.model.get('log2var'));
                generateHistogram('subjectDist', 'Number at minimum', "Frequency", 'Distribution of number of subject at min', this.model.get('num.min'));
            }
        } else {
            this.$el.html('');
        }
    }
});

// view the correlation heatmap
appComets.HeatmapView = Backbone.View.extend({
    el: "#tab-heatmap",
    initialize: function () {
        this.model.on('change',this.render,this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.heatmapResult);
            this.render();
        }
    },
    render: function () {
        if (this.model.get('correlationRun')) {
            this.model.set('plotHeight', Math.min(Math.max(this.model.get('plotHeight'), 200), 9000));
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status')) {
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
            }
        } else {
            this.$el.html('');
        }
    },
    events: {
        "change select": "updateModel",
        "change input:not([type='button'])": "updateModel"
    },
    updateModel: function(e) {
        var e = $(e.target);
        this.model.set(e.attr("id"), e.val());
    }
});

// view the correlation summary
appComets.SummaryView = Backbone.View.extend({
    el: "#tab-summary",
    initialize: function () {
        this.model.on('change',this.render,this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.correlationResult);
            this.render();
        }
    },
    events: {
        "click .download": 'startDownload',
    },
    render: function () {
        if (this.model.get('correlationRun')) {
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status')) {
                var table = this.$el.find('#correlationSummary').DataTable({
                    buttons: [],
                    dom: 'lfrBtip',
                    pageLength: 25
                });
                table.columns().every(function () {
                    var column = this;
                    $(table.table().header()).children().eq(0).children().eq(this.selector.cols).find('input').on('keyup change', function () {
                        if (column.search() !== this.value) column.search(this.value).draw();
                    });
                });
                table.button().add(0,{
                    action: function() {
                        alert("starting download");
                    },
                    text: 'Download Results in CSV'
                });
            }
        } else {
            this.$el.html('');
        }
    }
});

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
        appComets.views.integrity = new appComets.IntegrityView({
            model: appComets.models.integrityResults
        });
        appComets.views.summary = new appComets.SummaryView({
            model: appComets.models.correlationResults
        });
        appComets.views.heatmap = new appComets.HeatmapView({
            model: appComets.models.correlationResults
        });
    });
});
