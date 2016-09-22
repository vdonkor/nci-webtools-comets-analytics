// app namespace
var appComets = {
    events: {
        preauthenticate: function (e, callback) {
            $.ajax({
                url: 'ping.txt'
            }).fail(function (data) {
                if (data.status === 401) {
                    appComets.events.reauthenticate(e);
                    e.preventDefault();
                }
            }).then(function (data) {
                callback(e);
            });
        },
        reauthenticate: function (e) {
            e.preventDefault();
            window.location = window.location;
            /*
            var newWindow = window.open("reauth.html");
            window.reauthCallback = function () {
                delete window.reauthCallback;
                $(e.target).trigger(e.type);
            };
            */
        },
        updateModel: function (e) {
            var e = $(e.target);
            if (e.attr('type') == 'checkbox') {
                this.model.set(e.attr('name') || e.attr('id'), e.prop('checked'));
            } else {
                this.model.set(e.attr('name') || e.attr('id'), !e.hasClass('selectized') ? e.val() : e.val().length > 0 ? e.val().split(',') : []);
            }
        }
    },
    models: {},
    sorts: {
        "Metabolite Name (A-Z)": function (obj1, obj2) {
            return ((obj1.metabolite_name > obj2.metabolite_name) ? 1 : (obj1.metabolite_name < obj2.metabolite_name) ? -1 : 0);
        },
        "Metabolite Name (Z-A)": function (obj1, obj2) {
            return ((obj1.metabolite_name < obj2.metabolite_name) ? 1 : (obj1.metabolite_name > obj2.metabolite_name) ? -1 : 0);
        },
        "default": function (property) {
            return function (obj1, obj2) {
                return obj2[property] - obj1[property];
            };
        }
    },
    views: {}
};

appComets.ErrorsView = Backbone.View.extend({
    el: '#messageDiv',
    render: function () {
        if (this.options && this.options.errors && this.options.errors.length > 0) {
            this.template = _.template("<%_.each(errors, function(error, i) { %><%= error %> <br/><%}) %>", this.options);
            this.$el.html("<div class='alert alert-danger'>" + this.template + "</div>");
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
        this.model.on({
            "change:cohortList": this.renderCohortList,
            "change:cohortSelection": this.renderCohortSelection,
            "change:csvFile": this.renderCheckIntegrityButton,
            "change:status": this.renderIntegrityChecked,
            "change:methodSelection": this.renderMethodSelection,
            "change:modelList": this.renderModelList,
            "change:modelDescription": this.renderModelDescription,
            "change:showMetabolites": this.renderShowMetabolites,
            "change:subjectIds change:metaboliteIds": this.renderModelOptions,
            "change:modelSelection": this.renderModelList,
            "change:outcome change:exposure": this.renderRunModelButton
        }, this);
        this.template = _.template(appComets.templatesList['harmonizationForm.options']);
        this.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
            $(el).selectize({
                plugins: ['remove_button'],
                sortField: 'order'
            });
        });
        this.renderCohortList.apply(this);
    },
    events: {
        "change #inputDataFile": "uploadInputDataFile",
        "change select": "updateModel",
        "change input:not([type='button'])": "updateModel",
        "keypress input:not([type='button'])": "noSubmit",
        "click #load": "checkIntegrity",
        "click #reset": "reset",
        "click #runModel": "runModel",
        "click #toggleHelp": function () {
            this.$el.find("#inputHelp").toggle();
        },
        "click #sampleDownload": 'authenticateDownload',
    },
    authenticateDownload: function (e) {
        appComets.events.preauthenticate(e, function (e) {
            window.location = e.target.href;
            e.preventDefault();
        });
    },
    noSubmit: function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            return false;
        }
    },
    uploadInputDataFile: function (e) {
        //add file to model
        var file = appComets.fileUpload(e);
        this.model.set("csvFile", file);
    },
    updateModel: appComets.events.updateModel,
    checkIntegrity: function (e) {
        e.preventDefault();
        var file = this.model.get("csvFile");
        if (file) {
            var $that = this;
            var formData = new FormData();
            formData.append("inputFile", file);
            formData.append("cohortSelection", this.model.get("cohortSelection"));
            appComets.models.integrityResults.fetch({
                type: "POST",
                data: formData,
                dataType: "json",
                cache: false,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    appComets.showLoader();
                    $that.$el.find("#calcProgressbar").show()
                        .find("[role='progressbar']")
                        .removeClass("progress-bar-danger progress-bar-success")
                        .addClass("active").text("Uploading....Please Wait");
                }
            }).fail(function (data, statusText, errorThrown) {
                if (data.status === 401) {
                    appComets.events.reauthenticate(e);
                }
                $that.$el.find("#calcProgressbar [role='progressbar']").addClass("progress-bar-danger").text("Upload Failed!");
                $that.$el.find("#inputDataFile").wrap("<form></form>").closest("form")[0].reset();
                $that.$el.find("#inputDataFile").unwrap();
                var response = data.responseJSON,
                    integrityResults = appComets.models.integrityResults,
                    correlationResults = appComets.models.correlationResults;
                if (response && 'status' in response) {
                    $that.model.set($.extend({},$that.model.attributes, {
                        status: response.status
                    }));
                    integrityResults.set($.extend({},integrityResults.attributes, {
                        csv: null,
                        integrityChecked: true,
                        status: response.status,
                        statusMessage: response.integritymessage
                    }));
                    correlationResults.set($.extend({},correlationResults.attributes, {
                        correlationRun: false
                    }));
                    $('[href="#tab-integrity"]').trigger('click');
                }
            }).then(function (data, statusText, xhr) {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload of '" + $that.model.get("csvFile").name + "' Complete");
                $that.model.set($.extend({}, $that.model.attributes, $that.model.defaults, {
                    cohortSelection: $that.model.get('cohortSelection'),
                    csvFile: $that.model.get('csvFile'),
                    filename: data.filename,
                    metaboliteIds: data.metaboliteIds,
                    modelList: data.models.map(function (model) {
                        return model.model;
                    }),
                    status: data.status,
                    subjectIds: data.subjectIds
                }));
                $('[href="#tab-integrity"]').trigger('click');
            }).always(function () {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("active");
                appComets.hideLoader();
            });
        }
    },
    reset: function(e) {
        e.preventDefault();
        var harmonizationForm = appComets.models.harmonizationForm,
            integrityResults = appComets.models.integrityResults,
            correlationResults = appComets.models.correlationResults;
        harmonizationForm.set($.extend({},harmonizationForm.defaults));
        integrityResults.set($.extend({},integrityResults.defaults));
        correlationResults.set($.extend({},correlationResults.defaults));
        this.$el.find("#calcProgressbar").hide();
        this.$el.find('#inputDataFile').val('');
    },
    runModel: function (e) {
        e.preventDefault();
        var methodSelection = this.model.get('methodSelection'),
            outcome = this.model.get('outcome'),
            exposure = this.model.get('exposure'),
            metaboliteIds = this.model.get('metaboliteIds'),
            outcomeCount = outcome.length + (outcome.includes('All metabolites') ? metaboliteIds.length-1 : 0),
            exposureCount = exposure.length + (exposure.includes('All metabolites') ? metaboliteIds.length-1 : 0);
        if (outcomeCount * exposureCount > 32500 && !confirm("A correlation matrix of this size may cause delays in working with the table.")) {
            return;
        }
        var $that = this;
        var formData = new FormData();
        var toAppend = {
            'filename': this.model.get('filename'),
            'cohortSelection': this.model.get('cohortSelection'),
            'methodSelection': this.model.get('methodSelection'),
            'modelSelection': methodSelection,
            'modelDescription': this.model.get('modelDescription'),
            'outcome': JSON.stringify(outcome),
            'exposure': JSON.stringify(exposure),
            'covariates': JSON.stringify(this.model.get('covariates')),
            'modelName': this.model.get('methodSelection') == 'Batch' ? this.model.get('modelSelection') : this.model.get('modelDescription')
        };
        for (var key in toAppend) {
            formData.append(key, toAppend[key]);
        }
        appComets.models.correlationResults.fetch({
            type: "POST",
            data: formData,
            dataType: "json",
            cache: false,
            processData: false,
            contentType: false,
            beforeSend: appComets.showLoader
        }).fail(function (data, statusText, errorThrown) {
            if (data.status === 401) {
                appComets.events.reauthenticate(e);
            }
            var response = data.responseJSON,
                correlationResults = appComets.models.correlationResults;
            if (response && 'status' in response) {
                correlationResults.set($.extend({},correlationResults.attributes, {
                    correlationRun: true,
                    status: response.status,
                    statusMessage: response.statusMessage
                }));
                $('a[href="#tab-summary"]').tab('show');
            }
            appComets.requestFail(data, statusText, errorThrown);
        }).always(function () {
            appComets.hideLoader();
            $('a[href="#tab-summary"]').tab('show');
        });
    },
    renderCohortList: function() {
        this.$el.find('#cohortSelection').html(this.template({
            optionType: "Cohort",
            optionList: this.model.get("cohortList"),
            selectedOption: this.model.get("cohortSelection")
        }));
    },
    renderCohortSelection: function() {
        this.$el.find('#cohortSelection').find('option[value="'+(this.model.get('cohortSelection')||"")+'"]').prop('selected',true);
        this.renderCheckIntegrityButton.apply(this);
    },
    renderCheckIntegrityButton: function() {
        if ((this.model.get("csvFile")||null !== null) && (this.model.get("cohortSelection")||"").length > 0) {
            this.$el.find("#load").removeAttr('disabled');
        } else {
            this.$el.find("#load").attr('disabled', true);
        }
    },
    renderIntegrityChecked: function() {
        if (this.model.get('status')) {
            this.$el.find('#integrityOptions').addClass('disabled');
            this.$el.find('#analysisOptions').addClass('show');
            this.renderMethodSelection.apply(this);
            this.renderModelList.apply(this);
            this.renderModelDescription.apply(this);
            this.renderShowMetabolites.apply(this);
        } else {
            this.$el.find('#integrityOptions').removeClass('disabled');
            this.$el.find('#analysisOptions').removeClass('show');
        }
    },
    renderMethodSelection: function() {
        var $that = this;
        this.$el.find('#Batch,#Interactive').each(function (i, el) {
            var id = el.id;
            var state = id == $that.model.get('methodSelection');
            $(el).toggleClass('show', state);
            $that.$el.find('input[name="methodSelection"][value="' + id + '"]').prop('checked', state);
        });
    },
    renderModelList: function() {
        this.$el.find('#modelSelection').html(this.template({
            optionType: 'Model',
            optionList: this.model.get('modelList'),
            selectedOption: this.model.get('modelSelection')
        }));
        this.renderRunModelButton.apply(this);
    },
    renderModelDescription: function() {
        this.$el.find('#modelDescription').val(this.model.get('modelDescription'));
    },
    renderShowMetabolites: function() {
        this.$el.find('#showMetabolites').prop('checked', this.model.get('showMetabolites'));
        this.renderModelOptions.apply(this);
    },
    renderModelOptions: function() {
        var $that = this;
        var modelOptions = [{
            text: 'All Metabolites',
            value: 'All metabolites'
        }].concat(this.model.get('subjectIds'));
        if (this.model.get('showMetabolites')) {
            modelOptions.shift();
            modelOptions = modelOptions.concat(this.model.get('metaboliteIds'));
        }
        modelOptions = modelOptions.map(function (option, key) {
            return {
                text: option.text,
                value: option.value,
                order: key
            };
        });
        this.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
            var sEl = el.selectize;
            var oldOptions = $.extend({}, sEl.options);
            _.each(modelOptions, function (option, key, list) {
                if (sEl.options[option.value] === undefined) {
                    sEl.addOption(option);
                } else {
                    sEl.updateOption(option.value, option);
                }
                delete oldOptions[option.value];
            });
            for (var option in oldOptions) {
                sEl.removeOption(option);
            }
            sEl.setValue($that.model.get(el.id), true);
        });
    },
    renderRunModelButton: function() {
        var methodSelection = this.model.get('methodSelection');
        if ((methodSelection == 'Batch' && this.model.get('modelSelection')) ||
            (methodSelection == 'Interactive' && this.model.get('outcome').length > 0 && this.model.get('exposure').length > 0)
        ) {
            this.$el.find('#runModel').removeAttr('disabled');
        } else {
            this.$el.find('#runModel').attr('disabled', true);
        }
    }
});

// view for the integrity check's results
appComets.IntegrityView = Backbone.View.extend({
    el: "#tab-integrity",
    initialize: function () {
        this.model.on('change', this.render, this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.integrityCheckResult);
            this.render();
        }
    },
    events: {
        'click #resultsDownload': 'startDownload'
    },
    startDownload: function (e) {
        var $that = this;
        if (this.model.get('csvDownload')) appComets.events.preauthenticate(e, function () {
            window.location = $that.model.get('csvDownload');
        });
    },
    render: function () {
        this.$el.html(this.template(this.model.attributes));
        if (this.model.get('integrityChecked')) {
            if (this.model.get('status')) {
                var log2var = this.model.get('log2var');
                if (log2var.map(function(e) { return e || false ? true : false; }).reduce(function(prev,curr) { return prev && curr; })) {
                    appComets.generateHistogram('varianceDist', 'Distribution of Variance', "Frequency", 'Variance of transformed metabolite abundances', log2var);
                }
                var nummin = this.model.get('num.min');
                if (nummin.map(function(e) { return e || false ? true : false; }).reduce(function(prev,curr) { return prev && curr; })) {
                    appComets.generateHistogram('subjectDist', 'Number of minimum/missing values', "Frequency", 'Distribution of the Number/Missing Values', nummin);
                }
            }
        }
    }
});


// view the correlation summary
appComets.SummaryView = Backbone.View.extend({
    el: "#tab-summary",
    initialize: function () {
        this.model.on('change', this.render, this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.correlationResult);
            this.render();
        }
    },
    render: function () {
        if (this.model.get('correlationRun')) {
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status')) {
                var table = this.$el.find('#correlationSummary').DataTable({
                    buttons: [],
                    dom: 'lfBtip',
                    pageLength: 25
                });
                var excorrdata = this.model.get('excorrdata'),
                    tableOrder = this.model.get('tableOrder'),
                    tr = [];
                _.each(excorrdata,function(row,pkey,list) {
                    tr.push([]);
                    _.each(tableOrder,function(element,key,list) {
                        tr[tr.length-1].push(row[element] == 0 ? row[element] : row[element]||"");
                    });
                    if (pkey % 1000 == 999) {
                        table.rows.add(tr);
                        tr = [];
                    }
                });
                table.rows.add(tr).draw();
                table.columns().every(function () {
                    var column = this;
                    var header = $(table.table().header()).children().eq(0).children().eq(this.selector.cols);
                    var toggleInputs = function(headMarker) {
                        header.find(headMarker).children('img').on('click', function() {
                            $(this).siblings('span').toggleClass('show').children('input').val('');
                            column.search('').draw();
                        });
                        var spans = header.find(headMarker).find('span');
                        spans.eq(0).children('input').on('keyup change', function() {
                            column.draw();
                        });
                        spans.eq(1).children('input').on('keyup change', function () {
                            if (column.search() !== this.value) column.search(this.value).draw();
                        });
                    }
                    if (header.find('.pvalue').length > 0) {
                        toggleInputs('.pvalue');
                    } else if (header.find('.corr').length > 0) {
                        toggleInputs('.corr');
                    } else {
                        header.find('input').on('keyup change', function () {
                            if (column.search() !== this.value) column.search(this.value).draw();
                        });
                    }
                });
                var $that = this;
                table.button().add(0, {
                    action: function (e) {
                        if ($that.model.get('csv')) appComets.events.preauthenticate(e, function () {
                            window.location = $that.model.get('csv');
                        });
                    },
                    text: 'Download Results in CSV'
                });
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
        this.model.on('change', this.render, this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.heatmapResult);
            this.render();
        }
    },
    events: {
        "change select": "updateModel",
        "change input:not([type='button'])": "updateModel"
    },
    updateModel: appComets.events.updateModel,
    render: function () {
        if (this.model.get('correlationRun')) {
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status')) {
                var sortRow = this.model.get('sortRow');
                var exposures = this.model.get('exposures');
                var correlationData = {};
                _.each(this.model.get('excorrdata'), function (metabolite, key, list) {
                    correlationData[metabolite.metabolite_name] = correlationData[metabolite.metabolite_name] || {
                        'metabolite_name': metabolite.metabolite_name
                    };
                    correlationData[metabolite.metabolite_name][metabolite.exposure] = metabolite.corr;
                });
                var clusterResults = this.model.get('clusterResults');
                var metaboliteNames = [];
                var values = [];
                if (clusterResults) {
                    var clustersort = this.model.get('clustersort');
                    exposures = clustersort.col;
                    metaboliteNames = clustersort.row;
                    for (var metaboliteIndex in metaboliteNames) {
                        row = [];
                        values[values.length] = row;
                        for (var exposureIndex in exposures) {
                            row[row.length] = correlationData[metaboliteNames[metaboliteIndex]][exposures[exposureIndex]];
                        }
                    }
                } else {
                    var heatmapData = [];
                    for (var prop in correlationData) {
                        heatmapData[heatmapData.length] = correlationData[prop];
                    }
                    heatmapData = heatmapData.sort((appComets.sorts[sortRow] || appComets.sorts.default(sortRow)));
                    values = heatmapData.map(function (biochem) {
                        return exposures.map(function (exposure) {
                            return biochem[exposure];
                        });
                    });
                    metaboliteNames = heatmapData.map(function (biochem) {
                        return biochem.metabolite_name;
                    });
                }
                var plotHeight = this.model.get('plotHeight');
                var plotWidth = this.model.get('plotWidth');
                plotHeight = Math.min(Math.max(plotHeight, 200), 9000);
                plotWidth = Math.min(Math.max(plotWidth, 200), 9000);
                if (plotHeight != this.model.get('plotHeight') || plotWidth != this.model.get('plotWidth')) {
                    this.model.set($.extend({},this.model.attributes, {
                        plotHeight: plotHeight,
                        plotWidth: plotWidth
                    }));
                }
                appComets.generateHeatmap('correlateHeatmap', {
                    annotated: this.model.get('displayAnnotations'),
                    clustered: clusterResults ? clustersort : null,
                    colorscale: this.model.get('plotColorscale'),
                    height: plotHeight,
                    width: plotWidth
                }, exposures, metaboliteNames, "Correlation", values);
            }
        } else {
            this.$el.html('');
        }
    }
});

$(function () {
    $('body').on('click','.goto',function(e) {
        var e = e.target;
        var offset = $($(e).attr('href')).offset();
        $('html, body').animate({scrollTop: offset.top},500);
        return false;
    });
    $('body').on('click','.clicktab',function(e) {
        var e = e.target;
        $('nav a[href="'+$(e).attr('href')+'"]').trigger('click');
        return false;
    });
    $('#logoutBtn').on('click', function (e) {
        e.preventDefault();
        var path = window.location.href;
        window.location = "/auth0_redirect?logout=" + encodeURIComponent(path.substring(0,path.lastIndexOf('/'))+"/public/logout.html");
    });
    templates = $.ajax({
        type: "GET",
        url: "/cometsRest/templates",
    }).fail(appComets.requestFail).then(function (data) {
        // attach templates array to module
        appComets.templatesList = data;
    }).done(function () {
        var setTitle = function (e) {
            document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
        };
        $('#pageContent').on('show.bs.tab', '#comets-tab-nav', setTitle);
        $('#pageContent').on('show.bs.tab', '#correlate-tab-nav', setTitle);
        $("#pageContent").on("click", "#runModel", function () {
            $('a[href="#tab-summary"]').tab('show');

        });
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

        appComets.views.errorsDisplay = new appComets.ErrorsView();
    });
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        var pvaluemin = $('#pvaluemin').val();
        var pvaluemax = $('#pvaluemax').val();
        var corrmin = $('#corrmin').val();
        var corrmax = $('#corrmax').val();
        pvaluemin = pvaluemin == '' ? null : parseFloat(pvaluemin);
        pvaluemax = pvaluemax == '' ? null : parseFloat(pvaluemax);
        corrmin = corrmin == '' ? null : parseFloat(corrmin);
        corrmax = corrmax == '' ? null : parseFloat(corrmax);
        if (pvaluemin || pvaluemax || corrmin || corrmax) {
            var returnValue = true;
            for (var index in settings.aoColumns) {
                if (settings.aoColumns[index].sTitle == 'pvalue') {
                    var pvalue = parseFloat(data[index]);
                    returnValue = returnValue ? (pvalue >= (pvaluemin || Number.NEGATIVE_INFINITY) && pvalue <= (pvaluemax || Number.POSITIVE_INFINITY)) : false;
                } else if (settings.aoColumns[index].sTitle == 'corr') {
                    var corr = parseFloat(data[index]);
                    returnValue = returnValue ? (corr >= (corrmin || Number.NEGATIVE_INFINITY) && corr <= (corrmax || Number.POSITIVE_INFINITY)) : false;
                }
            }
            return returnValue;
        }
        return true;
    });
});;