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
            window.location.reload(true);
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

appComets.HeaderView = Backbone.View.extend({
    el: '#pageContent > div:first-child',
    initialize: function() {
        this.model.on('change', this.render, this);
        this.model.fetch();
    },
    render: function() {
        var comets = this.model.get('comets'),
            name = this.model.get('given_name')+' '+this.model.get('family_name');
        $('#adminBtn').toggleClass('show',(comets == 'admin'))
        $('#logoutBtn').siblings('span').html('Welcome'+((name||' ')!==' '?', '+name:'')+'!');
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
                $that.model.set($.extend({}, $that.model.defaults, $that.model.attributes, {
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
        harmonizationForm.reset();
        integrityResults.reset();
        correlationResults.reset();
        this.$el.find("#calcProgressbar").hide();
        this.$el.find('#inputDataFile').val('');
        $('[href="#tab-integrity"]').trigger('click');
    },
    runModel: function (e) {
        e.preventDefault();
        var methodSelection = this.model.get('methodSelection'),
            outcome = this.model.get('outcome'),
            exposure = this.model.get('exposure'),
            metaboliteIds = this.model.get('metaboliteIds'),
            outcomeCount = outcome.length + (outcome.includes('All metabolites') ? metaboliteIds.length-1 : 0),
            exposureCount = exposure.length + (exposure.includes('All metabolites') ? metaboliteIds.length-1 : 0);
        if (outcomeCount * exposureCount > 32500 && !confirm("A correlation matrix of this size may cause delays in displaying the results.")) {
            return;
        }
        var $that = this;
        var formData = new FormData();
        var toAppend = {
            'filename': this.model.get('filename'),
            'cohortSelection': this.model.get('cohortSelection'),
            'methodSelection': methodSelection,
            'modelSelection': this.model.get('modelSelection'),
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
            beforeSend: appComets.showLoader,
            reset: true
        }).fail(function (data, statusText, errorThrown) {
            if (data.status === 401) {
                appComets.events.reauthenticate(e);
            }
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
        if (!this.model.get('status') && (this.model.get("csvFile")||null !== null) && (this.model.get("cohortSelection")||"").length > 0) {
            this.$el.find("#load").removeAttr('disabled');
        } else {
            this.$el.find("#load").attr('disabled', true);
        }
    },
    renderIntegrityChecked: function() {
        if (this.model.get('status')) {
            this.$el.find('#cohortSelection').attr('disabled', true);
            this.$el.find('#inputDataFile').attr('disabled', true);
            this.$el.find('#load').attr('disabled', true);
            this.$el.find('#analysisOptions').addClass('show');
            this.renderMethodSelection.apply(this);
            this.renderModelList.apply(this);
            this.renderModelDescription.apply(this);
            this.renderShowMetabolites.apply(this);
        } else {
            this.$el.find('#cohortSelection').removeAttr('disabled');
            this.$el.find('#inputDataFile').removeAttr('disabled');
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
        this.model.on({
            'reset': this.render,
            'change:filterdata': this.renderTable,
            'change:page': this.renderTable,
            'change:pageCount': this.renderTable
        }, this);
        if (appComets.templatesList) {
            this.template = _.template(appComets.templatesList.correlationResult);
            this.pagingTemplate = _.template(appComets.templatesList.correlationResultPaging);
            this.render();
        }
    },
    events: {
        'change select': 'entryCount',
        'keyup input[type="text"]': 'columnSearch',
        'click #pagingRow a': 'pageTab',
        'click #summaryDownload': 'startDownload'
    },
    startDownload: function (e) {
        e.preventDefault();
        var $that = this;
        if (this.model.get('csv')) appComets.events.preauthenticate(e, function () {
            window.location = $that.model.get('csv');
        });
    },
    entryCount: function(e) {
        var entryCount = $(e.target).val();
        this.model.set({
            'entryCount': entryCount,
            'page': 1,
            'pageCount': Math.ceil(this.model.get('filterdata').length/entryCount)
        });
    },
    pageTab: function(e) {
        e.preventDefault();
        var e = $(e.target);
        if (e.parent().hasClass('disabled')) return;
        var val = e.html(),
            page = this.model.get('page');
        if (val == 'Next') {
            page = Math.min(page+1,this.model.get('pageCount'))||1;
        } else if (val == 'Previous') {
            page = Math.max(1,page-1);
        } else {
            page = parseInt(val);
        }
        this.model.set('page',page);
    },
    columnSearch: function(e) {
        var e = $(e.target);
        var min = e.hasClass('min'),
            max = e.hasClass('max'),
            minmax = '',
            name = e.prop('name'),
            value = e.val(),
            subset = false,
            filterdata = this.model.get('filterdata');
        if (min) {
            minmax = "min";
            value = parseFloat(value);
            oldValue = this.model.get(name+minmax);
            if (Number.isNaN(value)) { value = Number.NEGATIVE_INFINITY; }
            if (oldValue === undefined) { oldValue = Number.NEGATIVE_INFINITY; }
            if (value >= oldValue) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    return entry[name] >= value;
                });
            }
        } else if (max) {
            minmax = "max";
            value = parseFloat(value);
            oldValue = this.model.get(name+minmax);
            if (Number.isNaN(value)) { value = Number.POSITIVE_INFINITY; }
            if (oldValue === undefined) { oldValue = Number.POSITIVE_INFINITY; }
            if (value <= oldValue) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    return entry[name] <= value;
                });
            }
        } else {
            value = (value||'').toLowerCase();
            oldValue = this.model.get(name)||'';
            if (value.includes(oldValue)) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    return String(entry[name]).toLowerCase().includes(value);
                });
            }
        }
        this.model.set(name+minmax,value);
        if (!subset) {
            filterdata = this.model.get('excorrdata');
            var tableOrder = this.model.get('tableOrder');
            for (var index in tableOrder) {
                var val = this.model.get(tableOrder[index]),
                    min = Number.parseFloat(this.model.get(tableOrder[index]+"min")),
                    max = Number.parseFloat(this.model.get(tableOrder[index]+"max"));
                if (!Number.isNaN(min)) {
                    if (!Number.isNaN(max)) {
                        filterdata = filterdata.filter(function(entry) {
                            source = Number.parseFloat(entry[tableOrder[index]]);
                            return source >= min && source <= max;
                        });
                    } else {
                        filterdata = filterdata.filter(function(entry) {
                            source = Number.parseFloat(entry[tableOrder[index]]);
                            return source >= min;
                        });
                    }
                } else if (!Number.isNaN(max)) {
                    filterdata = filterdata.filter(function(entry) {
                        source = Number.parseFloat(entry[tableOrder[index]]);
                        return source <= max;
                    });
                } else if (val !== undefined && val !== null) {
                    filterdata = filterdata.filter(function(entry) {
                        source = String(entry[tableOrder[index]]);
                        return source.includes(String(val));
                    });
                }
            }
        }
        this.model.set({
            'filterdata': filterdata,
            'page': 1,
            'pageCount': Math.ceil(filterdata.length/this.model.get('entryCount'))
        });
    },
    render: function () {
        if (this.model.get('correlationRun')) {
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status') == true) {
                this.renderTable.apply(this);
            }
        } else {
            this.$el.html('');
        }
    },
    renderTable: function() {
        var map = this.model.get('filterdata'),
            page = this.model.get('page'),
            tableOrder = this.model.get('tableOrder'),
            entryCount = this.model.get('entryCount');
        this.$el.find('#correlationSummary tbody').empty();
        var tr = '';
        for (var index = (page-1)*entryCount; index < Math.min(page*entryCount,map.length); index++) {
            tr += '<tr>';
            for (var orderIndex in tableOrder) {
                tr += '<td>'+map[index][tableOrder[orderIndex]]+'</td>';
            }
            tr += '</tr>';
        }
        this.$el.find('#correlationSummary tbody').append(tr);
        this.$el.find('#pagingRow').html(this.pagingTemplate(this.model.attributes));
    }
});


// view the correlation heatmap
appComets.HeatmapView = Backbone.View.extend({
    el: "#tab-heatmap",
    initialize: function () {
        this.model.on({
            'reset': this.render,
            'change:clusterResults': this.render,
            'change:clustersort': this.render,
            'change:displayAnnotations': this.render,
            'change:excorrdata': this.render,
            'change:plotColorscale': this.render,
            'change:plotHeight': this.render,
            'change:plotWidth': this.render,
            'change:sortRow': this.render
        }, this);
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
                var sortRow = this.model.get('sortRow'),
                    exposures = this.model.get('exposures'),
                    lookup = this.model.get('lookup');
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
                    metaboliteNames = metaboliteNames.map(function (metabid) {
                        return lookup[metabid];
                    });
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
                        return lookup[biochem.metabolite_name];
                    });
                }
                exposures = exposures.map(function(metabid) {
                    return lookup[metabid];
                });
                var plotHeight = this.model.get('plotHeight'),
                    plotWidth = this.model.get('plotWidth');
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
                    lookup: lookup,
                    width: plotWidth
                }, exposures, metaboliteNames, "Correlation", values);
            }
        } else {
            this.$el.html('');
        }
    }
});

$(function () {
    var url = document.location.toString();
    if (url.match('#')) {
        var tab = $('.navbar a[data-toggle="tab"][href="#' + url.split('#')[1] + '"]');
        if (tab.length > 0) {
            tab.tab('show');
            setTimeout(function() {
                window.scrollTo(0, 0);
            }, 1);
        }
    }
    $('.navbar a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var old = $(e.target.hash).removeAttr('id');
        var anchor = $('<a id="'+e.target.hash+'"/>').prependTo($('body'));
        window.location.hash = e.target.hash;
        anchor.remove();
        old.attr('id',e.target.hash);
    });
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
    }).then(function (data) {
        // attach templates array to module
        appComets.templatesList = data;
    }).done(function () {
        var setTitle = function (e) {
            document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
        };
        $('#pageContent').on('show.bs.tab', '#comets-tab-nav', setTitle);
        $('#pageContent').on('show.bs.tab', '#correlate-tab-nav', setTitle);
        $('#pageContent').on('click', '#runModel', function () {
            $('a[href="#tab-summary"]').tab('show');

        });
        appComets.models.header = new appComets.HeaderModel();
        appComets.models.integrityResults = new appComets.IntegrityResultsModel();
        appComets.models.correlationResults = new appComets.CorrelationResultsModel();
        
        appComets.models.cohortsList = new appComets.CohortsModel();
        appComets.models.cohortsList.fetch().done(function(resp) {
            appComets.HarmonizationFormModel.prototype.defaults.cohortList = appComets.models.cohortsList.get('cohorts');
            appComets.models.harmonizationForm = new appComets.HarmonizationFormModel();
            appComets.views.formView = new appComets.FormView({
                model: appComets.models.harmonizationForm
            });
        });
        
        appComets.views.header = new appComets.HeaderView({
            model: appComets.models.header
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
});;