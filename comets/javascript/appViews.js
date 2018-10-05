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
            if (e !== undefined) e.preventDefault();
            window.location = "public/timeout.html";
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
                this.model.set(e.attr('name') || e.attr('id'), !e.hasClass('selectized') ? e.val() : e.val().length > 0 ? e.val().split('|') : []);
            }
        }
    },
    models: {},
    sorts: {
        "Metabolite Name (A-Z)": function (obj1, obj2) {
            return ((obj1.outcome > obj2.outcome) ? 1 : (obj1.outcome < obj2.outcome) ? -1 : 0);
        },
        "Metabolite Name (Z-A)": function (obj1, obj2) {
            return ((obj1.outcome < obj2.outcome) ? 1 : (obj1.outcome > obj2.outcome) ? -1 : 0);
        },
        "property": function (property,sortAsc) {
            return function (obj1, obj2) {
                var obj1 = obj1[property],
                    obj2 = obj2[property];
                if (isNaN(parseFloat(obj1)) || isNaN(parseFloat(obj2))) {
                    obj1 = obj1||"";
                    obj2 = obj2||"";
                    return obj2 > obj1 ? (sortAsc?-1:1) : obj2 < obj1 ? (sortAsc?1:-1) : 0;
                } else {
                    obj1 = parseFloat(obj1);
                    obj2 = parseFloat(obj2);
                    return sortAsc ? obj1 - obj2 : obj2 - obj1;
                }
            };
        },
        "default": function (property) {
            return function (obj1, obj2) {
                return (obj2[property]==0?0:obj2[property]||Number.POSITIVE_INFINITY) - (obj1[property]==0?0:obj1[property]||Number.POSITIVE_INFINITY);
            };
        }
    },
    views: {}
};

appComets.BaseView = Backbone.View.extend({
    el: 'body',
    initialize: function() {
        var url = document.location.toString();
        this.render();
        if (url.match('#')) {
            var tab = $('.navbar a[data-toggle="tab"][data-target="#' + url.split('#')[1] + '"]');
            if (tab.length > 0) {
                tab.tab('show');
                setTimeout(function() {
                    window.scrollTo(0, 0);
                }, 1);
            }
        }
    },
    render: function() {
        appComets.views.home = new appComets.HomeView();
        appComets.views.header = new appComets.HeaderView({
            model: this.model
        });
        appComets.views.combineView = new appComets.CombineView({
            model: this.model.get('combineForm')
        });
        appComets.views.formView = new appComets.FormView({
            model: this.model.get('harmonizationForm')
        });
        appComets.views.integrity = new appComets.IntegrityView({
            model: this.model.get('integrityResults')
        });
        appComets.views.summary = new appComets.SummaryView({
            model: this.model.get('correlationResults')
        });
        appComets.views.heatmap = new appComets.HeatmapView({
            model: this.model.get('correlationResults')
        });
        appComets.views.help = new appComets.HelpView();
    }
});

appComets.HeaderView = Backbone.View.extend({
    el: '#header',
    initialize: function() {
        this.model.on('change', this.render, this);
        this.model.fetch();
    },
    events: {
        'click #logoutBtn': 'logout',
        'shown.bs.tab a[data-toggle="tab"]': 'onTab',
        'click #adminBtn': 'goToAdmin'
    },
    goToAdmin: function(e) {
        var model = this.model;
        if (model.get('integrityResults').get('integrityChecked') || model.get('correlationResults').get('correlationRun')) {
            e.preventDefault();
            this.$modal = BootstrapDialog.show({
                buttons: [{
                    'cssClass': 'btn-primary',
                    'label': "Continue",
                    'action': function(dialog) {
                        var a = $(e.target);
                        if (a.prop('tagName') !== 'A') a = a.find('a');
                        window.location = a.attr('href');
                    }
                }, {
                    'cssClass': 'btn-primary',
                    'label': "Cancel",
                    'action': function(dialog) {
                        dialog.close();
                    }
                }],
                closable: false,
                message: $("<p>If you leave now you will lose access to your current work. Do you wish to continue?</p>" +
                           "<p>You can also click \"Cancel\" then right-click the \"Admin\" button to open it in a new tab.</p>"),
                title: "You are about to leave the page."
            });
        }
    },
    logout: function (e) {
        e.preventDefault();
        var path = window.location.href;
        window.location = "/auth0_redirect?logout=" + encodeURIComponent(path.substring(0,path.lastIndexOf('/'))+"/public/logout.html");
    },
    onTab: function(e) {
        var target = $(e.target).attr('data-target').substring(1);
        $(e.target).parent().parent().siblings().find('li.active').removeClass('active')
        var old = $('#'+target).removeAttr('id');
        var anchor = $('<a id="'+target+'"/>').prependTo($('body'));
        window.location.hash = target;
        anchor.remove();
        old.attr('id',target);
    },
    render: function() {
        var comets = this.model.get('comets'),
            name = this.model.get('given_name')+' '+this.model.get('family_name');
        $('#adminBtn').toggleClass('show',(comets == 'admin'))
        $('#logoutBtn').siblings('span').html('Welcome'+((name||' ')!==' '?', '+name:'')+'!');
    }
});

appComets.CombineView = Backbone.View.extend({
    el: "#tab-combine",
    initialize: function() {
        this.model.on({
            'change:downloadLink': this.renderDownload,
            'change:statusMessage': this.renderMessage,
            'change:templateSelection': this.renderSubmit,
            'change:abundances change:metadata change:sample': this.renderTemplate
        }, this);
        this.optionsTemplate = _.template(appComets.templatesList['harmonizationForm.options']);
        this.template = _.template(appComets.templatesList['combineDropdown']);
        this.$el.find('#templateSelection').html(this.optionsTemplate({
            optionType: "Template",
            optionList: this.model.get("templateList"),
            selectedOption: this.model.get("templateSelection")
        }));
    },
    events: {
        'change #templateSelection': appComets.events.updateModel,
        'change input[type="file"]': 'uploadFile',
        'change fieldset:last-child select': 'updateVarmap',
        'click #resetCombine': 'reset',
        'click #combineFiles': 'combineFiles'
    },
    combineFiles: function(e) {
        e.preventDefault();
        var $that = this,
            formData = new FormData(this.$el.find('form')[0]),
            disables = this.$el.find('input,select,#combineFiles');
        disables.attr('disabled',true);
        this.model.fetch({
            type: "POST",
            data: formData,
            dataType: "json",
            cache: false,
            processData: false,
            contentType: false,
            beforeSend: function () {
                appComets.showLoader();
            }
        }).fail(function(xhr) {
            var response = (xhr.responseJSON || {'statusMessage': 'An unknown error has occurred.'});
            disables.removeAttr('disabled');
            $that.model.set('statusMessage',response.statusMessage);
        }).always(function() {
            appComets.hideLoader();
        });
    },
    reset: function(e) {
        e.preventDefault();
        this.model.set({
            'downloadLink': null,
            'statusMessage': ""
        });
        this.$el.find('input,select').removeAttr('disabled');
        this.$el.find('[type="file"]').val('').trigger('change');
    },
    uploadFile: function(e) {
        e.preventDefault();
        var $that = this,
            el = $(e.target),
            name = el.attr('name') || el.attr('id');
        if (window.FileReader && e.target.files[0]) {
            var file = e.target.files[0],
                reader = new window.FileReader();
            reader.onload = function(evt) {
                var content = evt.target.result;
                content = content.substring(0,content.search(/[\r\n]/)).split(',');
                $that.model.set(name, content);
            };
            reader.readAsText(file);
        } else {
            $that.model.set(name, {});
        }
    },
    updateVarmap: function (e) {
        var e = $(e.target),
            name = e.attr('name') || e.attr('id'),
            varmap = $.extend({},this.model.get('varmap'));
        varmap[name] = e.val();
        this.model.set('varmap',varmap);
    },
    renderDownload: function() {
        var downloadLink = this.model.get('downloadLink');
        this.$el.find('#combineDownload')
            .toggleClass('show',downloadLink)
            .find('a').attr('href',downloadLink);
    },
    renderMatch: function() {
        this.$el.find('fieldset').eq(2).html(this.template({
            'data': this.model.get('templateData'),
            'metadata': this.model.get('metadata').map(function(entry) {
                return {'text': entry, 'value': entry};
            }),
            'sample': this.model.get('sample').map(function(entry) {
                return {'text': entry, 'value': entry};
            }),
            'template': this.optionsTemplate,
            'varmap': this.model.get('varmap')
        }));
    },
    renderMessage: function() {
        this.$el.find('#combineMessage').html(this.model.get('statusMessage'));
    },
    renderSubmit: function() {
        var templateSelection = this.model.get('templateSelection');
        if (templateSelection.length > 0) {
            var varmap = {};
            var template = this.model.get('templateList')
                .filter(function(entry) { return entry.value == templateSelection; })[0];
            template.varlist.map(function(entry) {
                varmap[entry] = "";
            });
            this.model.set('templateData',template.data)
            this.model.set('varmap',varmap);
            this.$el.find('#combineFiles').removeAttr('disabled');
            this.$el.find('fieldset').eq(2).addClass('show');
            this.renderMatch.apply(this);
        } else {
            this.model.set('varmap',{});
            this.$el.find('#combineFiles').attr('disabled',true);
            this.$el.find('fieldset').eq(2).removeClass('show');
        }
    },
    renderTemplate: function() {
        var file1 = Object.keys(this.model.get('metadata')).length > 0,
            file2 = Object.keys(this.model.get('abundances')).length > 0,
            file3 = Object.keys(this.model.get('sample')).length > 0;
        if (file1 && file2 && file3) {
            this.$el.find('fieldset').eq(1).addClass('show');
        } else {
            var fieldsets = this.$el.find('fieldset'),
                select = fieldsets.eq(1).find('select');
            fieldsets.eq(1).removeClass('show');
            select[0].selectedIndex = 0;
            select.trigger('change');
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
            "change:email": this.renderEmail,
            "change:status": this.renderIntegrityChecked,
            "change:methodSelection": this.renderMethodSelection,
            "change:modelList": this.renderModelList,
            "change:modelDescription": this.renderModelDescription,
            "change:showMetabolites": this.renderShowMetabolites,
            "change:subjectIds change:metaboliteIds change:defaultOptions": this.renderModelOptions,
            "change:modelSelection": this.renderModelList,
            "change:outcome change:exposure change:whereCategory change:whereComparator change:whereFilter": this.renderRunModelButton,
            "change:strata": this.renderStrataAlert
        }, this);
        this.template = _.template(appComets.templatesList['harmonizationForm.options']);
        this.$el.find('#outcome, #exposure, #covariates').each(function (i, el) {
            $(el).selectize({
                delimiter: '|',
                plugins: ['remove_button', '508_compliance'],
                sortField: 'order'
            });
        });
        this.renderCohortList.apply(this);
    },
    events: {
        "change #inputDataFile": "uploadInputDataFile",
        "change select": "updateModel",
        "change input:not([type='button'])": "updateModel",
        "keyup input:not([type='button'])": "noSubmit",
        "click #load": "checkIntegrity",
        "click #whereClear": "resetWhere",
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
        } else {
            $(e.target).trigger('change');
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
                    $('a[href="#tab-integrity"]').trigger('click');
                }
            }).then(function (data, statusText, xhr) {
                $that.$el.find("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload of '" + $that.model.get("csvFile").name + "' Complete");
                $that.model.set($.extend({}, $that.model.defaults, $that.model.attributes, {
                    filename: data.filename,
                    metaboliteIds: data.metaboliteIds,
                    modelList: data.models.map(function (model) {
                        return { 'text': model.model, 'value': model.model };
                    }),
                    originalFilename: data.originalFilename,
                    status: data.status,
                    stratifiable: data.stratifiable,
                    subjectIds: data.subjectIds,
                    rdsFilePath: data.rdsFilePath,
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
    resetWhere: function(e) {
      e.preventDefault();
      var elem = $(e.target).next();
      elem[0].selectedIndex = 0;
      elem = elem.next();
      elem[0].selectedIndex = 0;
      elem.next().val('');
      this.model.set({
        'whereCategory': '',
        'whereComparator': '',
        'whereFilter': ''
      });
    },
    runModel: function (e) {
        e.preventDefault();
        var $that = this,
            runModelHelper = function() {
                var makeList = function(entry) { return entry.split(';'); };
                var methodSelection = this.model.get('methodSelection'),
                    outcome = _.flatten(this.model.get('outcome').map(makeList)),
                    exposure = _.flatten(this.model.get('exposure').map(makeList)),
                    covariates = _.flatten(this.model.get('covariates').map(makeList)),
                    metaboliteIds = this.model.get('metaboliteIds'),
                    whereCategory = this.model.get('whereCategory'),
                    whereComparator = this.model.get('whereComparator'),
                    whereFilter = this.model.get('whereFilter'),
                    whereQuery = [];
                var outcomeCount = outcome.length + ((outcome.indexOf('All metabolites') > -1) ? metaboliteIds.length-1 : 0),
                    exposureCount = exposure.length + ((exposure.indexOf('All metabolites') > -1) ? metaboliteIds.length-1 : 0);
                if (outcomeCount * exposureCount > 32500 && !confirm("A correlation matrix of this size may cause delays in displaying the results.")) {
                    return;
                }
                if (whereCategory != '' && whereComparator != '' && whereFilter != '') {
                    whereQuery.push([this.model.get('whereCategory'),this.model.get('whereComparator'),this.model.get('whereFilter')].join(""));
                }
                var $that = this;
                var formData = new FormData();
                var toAppend = {
                    'inputFile': this.model.get('csvFile'),
                    'originalFilename': this.model.get('originalFilename'),
                    'filename': this.model.get('filename'),
                    'cohortSelection': this.model.get('cohortSelection'),
                    'methodSelection': methodSelection,
                    'modelSelection': this.model.get('modelSelection'),
                    'modelDescription': this.model.get('modelDescription'),
                    'outcome': JSON.stringify(outcome),
                    'exposure': JSON.stringify(exposure),
                    'covariates': JSON.stringify(covariates),
                    'strata': this.model.get('strata'),
                    'modelName': this.model.get('methodSelection') == 'Batch' ? this.model.get('modelSelection') : this.model.get('modelDescription'),
                    'email': this.model.get('email'),
                    'whereQuery': JSON.stringify(whereQuery),
                    'rdsFilePath': this.model.get('rdsFilePath'),
                };

                for (var key in toAppend) {
                    var value = toAppend[key];
                    if (value && value.constructor === File)
                      formData.append(key, value, value.name)
                    else
                      formData.append(key, value);
                }

                return appComets.models.correlationResults.fetch({
                    type: "POST",
                    data: formData,
                    dataType: "json",
                    cache: false,
                    processData: false,
                    contentType: false,
                    beforeSend: appComets.showLoader,
                    reset: true
                }).always(function () {
                    appComets.hideLoader();
                });
            };
        if (this.model.get('methodSelection') == 'Batch' && this.model.get('modelSelection') == "All models") {
            BootstrapDialog.confirm({
                btnOKClass: 'btn-primary',
                closable: false,
                message: "Your job will be sent to the queuing system for processing. "+
                         "Results will be sent to you via email when all model runs are completed.\n\n"+
                         "Please note: Depending on model complexity and queue length it could be up to a day before you receive your results",
                title: "Results Will Be Emailed",
                callback: function(result) {
                    if (!result) return;
                    runModelHelper.apply($that).fail(function(xhr) {
                        var response = xhr.responseJSON||{'status': false, 'statusMessage': 'An unknown error has occurred.'};
                        if (!response.status) {
                            $('a[href="#tab-summary"]').tab('show');
                        }
                    });
                }
            });
        } else {
            runModelHelper.apply($that).always(function () {
                $('a[href="#tab-summary"]').tab('show');
            });
        }
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
    renderEmail: function() {
        this.$el.find('[name="email"]').val(this.model.get('email'));
        this.renderRunModelButton.apply(this);
    },
    renderEmailOption: function() {
        if (this.model.get('methodSelection') == 'Batch' && this.model.get('modelSelection') == "All models") {
            this.$el.find('#emailOption').addClass('show');
        } else {
            this.$el.find('#emailOption').removeClass('show');
            this.model.set('email','');
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
        this.renderEmailOption.apply(this);
        this.renderRunModelButton.apply(this);
    },
    renderModelList: function() {
        this.$el.find('#modelSelection').html(this.template({
            optionType: 'Model',
            optionList: this.model.get('modelList'),
            selectedOption: this.model.get('modelSelection')
        }));
        this.renderEmailOption.apply(this);
        this.renderRunModelButton.apply(this);
    },
    renderModelDescription: function() {
        this.$el.find('#modelDescription').val(this.model.get('modelDescription'));
    },
    renderModelOptions: function() {
        var $that = this;
        var modelOptions = this.model.get('defaultOptions').concat(this.model.get('subjectIds'));
        if (this.model.get('showMetabolites')) {
            modelOptions = modelOptions.concat(this.model.get('metaboliteIds').map(function(entry) { return { text: entry, value: entry }; }));
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
        modelOptions.shift();
        this.$el.find('#strata').html(this.template({
            optionType: "Strata",
            optionList: modelOptions,
            selectedOption: this.model.get("strata")
        }));
        this.$el.find('[name="whereCategory"]').html(this.template({
            optionType: "Category",
            optionList: modelOptions,
            selectedOption: this.model.get("whereCategory")
        }));
        this.$el.find('[name="whereComparator"]').html(this.template({
            optionType: "Operator",
            optionList: [ {
              "text": "&lt;",
              "value": "<"
            }, {
              "text": "&lt;=",
              "value": "<="
            }, {
              "text": "=",
              "value": "="
            }, {
              "text": "&gt;",
              "value": ">"
            }, {
              "text": "&gt;=",
              "value": ">="
            } ],
            selectedOption: this.model.get("whereComparator")
        }));
        this.$el.find('[name="whereFilter"]').val('');
    },
    renderRunModelButton: function() {
        var email = this.model.get('email'),
            methodSelection = this.model.get('methodSelection'),
            modelSelection = this.model.get('modelSelection'),
            exposure = this.model.get('exposure'),
            covariates = this.model.get('covariates'),
            whereQuery = ((this.model.get('whereCategory')==''?1:0)+(this.model.get('whereComparator')==''?1:0)+(this.model.get('whereFilter')==''?1:0))%3==0;
        if (((methodSelection == 'Batch' && modelSelection && !(modelSelection == "All models" && email == "")) ||
             (methodSelection == 'Interactive' && this.model.get('outcome').length > 0 && exposure.length > 0 && exposure.indexOf(this.model.get('strata')) < 0 && covariates.indexOf(this.model.get('strata')) < 0)) &&
              whereQuery
        ) {
            this.$el.find('#runModel').removeAttr('disabled');
        } else {
            this.$el.find('#runModel').attr('disabled', true);
        }
    },
    renderShowMetabolites: function() {
        this.$el.find('#showMetabolites').prop('checked', this.model.get('showMetabolites'));
        this.renderModelOptions.apply(this);
    },
    renderStrataAlert: function() {
        var $that = this,
            strataValue = this.model.get('strata');
        if (strataValue == '') {
            this.renderModelOptions.apply(this);
            return;
        }
        var stratifiable = this.model.get('stratifiable')[strataValue],
            subjectIds = this.model.get('subjectIds'),
            strataText = subjectIds.filter(function(entry) { return entry.value == strataValue })[0].text;
        if (stratifiable) {
            this.renderModelOptions.apply(this);
        } else {
            BootstrapDialog.confirm({
                'message': strataText+" has at least one value with less than 15 entries, which will not be evaluated.",
                'closable': false,
                'callback': function(result) {
                    if (!result) {
                        $that.model.set('strata','',{'silent':true});
                    }
                    $that.renderModelOptions.apply($that);
                }
            });
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
                if (log2var.map(function(e) { return e || false ? true : false; }).reduce(function(prev,curr) { return prev && curr; },true)) {
                    appComets.generateHistogram('varianceDist', 'Distribution of Variance', "Frequency", 'Variance of transformed metabolite abundances', log2var);
                }
                var nummin = this.model.get('num.min');
                if (nummin.map(function(e) { return e || false ? true : false; }).reduce(function(prev,curr) { return prev && curr; },true)) {
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
        'click #summaryDownload': 'startDownload',
        'click #customList': 'customList',
        'change input[type="checkbox"]': 'selectRow',
        'click [data-comets-header]': 'sortColumn',
        'keypress [data-comets-header]': 'passClick'
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
            if (isNaN(value)) { value = Number.NEGATIVE_INFINITY; }
            if (oldValue === undefined) { oldValue = Number.NEGATIVE_INFINITY; }
            if (value >= oldValue) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    var source = parseFloat(entry[name]);
                    return (isNaN(source)?Number.NEGATIVE_INFINITY:source) >= value;
                });
            }
        } else if (max) {
            minmax = "max";
            value = parseFloat(value);
            oldValue = this.model.get(name+minmax);
            if (isNaN(value)) { value = Number.POSITIVE_INFINITY; }
            if (oldValue === undefined) { oldValue = Number.POSITIVE_INFINITY; }
            if (value <= oldValue) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    var source = parseFloat(entry[name]);
                    return (isNaN(source)?Number.POSITIVE_INFINITY:source) <= value;
                });
            }
        } else {
            value = (value||'').toLowerCase();
            oldValue = this.model.get(name)||'';
            if (value.indexOf(oldValue) > -1) {
                subset = true;
                filterdata = filterdata.filter(function(entry) {
                    return String(entry[name]).toLowerCase().indexOf(value) > -1;
                });
            }
        }
        this.model.set(name+minmax,value);
        if (!subset) {
            filterdata = this.model.get('excorrdata').sort(appComets.sorts.property(this.model.get('sortHeader'),this.model.get('sortAsc')));
            var tableOrder = this.model.get('tableOrder');
            for (var index in tableOrder) {
                var val = this.model.get(tableOrder[index]),
                    min = parseFloat(this.model.get(tableOrder[index]+"min")),
                    max = parseFloat(this.model.get(tableOrder[index]+"max"));
                if (!isNaN(min)) {
                    if (!isNaN(max)) {
                        filterdata = filterdata.filter(function(entry) {
                            var source = parseFloat(entry[tableOrder[index]]);
                            return (isNaN(source)?Number.NEGATIVE_INFINITY:source) >= min && (isNaN(source)?Number.POSITIVE_INFINITY:source) <= max;
                        });
                    } else {
                        filterdata = filterdata.filter(function(entry) {
                            var source = parseFloat(entry[tableOrder[index]]);
                            return (isNaN(source)?Number.NEGATIVE_INFINITY:source) >= min;
                        });
                    }
                } else if (!isNaN(max)) {
                    filterdata = filterdata.filter(function(entry) {
                        var source = parseFloat(entry[tableOrder[index]]);
                        return (isNaN(source)?Number.POSITIVE_INFINITY:source) <= max;
                    });
                } else if (val !== undefined && val !== null) {
                    filterdata = filterdata.filter(function(entry) {
                        var source = String(entry[tableOrder[index]]).toLowerCase();
                        return source.indexOf(String(val)) > -1;
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
    customList: function(e) {
        e.preventDefault(e);
        new appComets.CustomListView({
            model: new appComets.CustomListModel({
                correlationModel: this.model,
                excorrdata: this.model.get('excorrdata'),
                formModel: appComets.models.harmonizationForm,
                metaboliteIds: appComets.models.harmonizationForm.get('metaboliteIds')
            })
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
    passClick: function(e) {
        e.preventDefault();
        if (e.keyCode == 13 || e.keyCode == 32) {
            $(e.target).trigger('click');
        }
        return false;
    },
    selectRow: function(e) {
        var e = $(e.target),
            name = e.prop('name'),
            checked = e.prop('checked')||false,
            data = this.model.get('filterdata');
        if (name === "all") {
            for (var index in data) {
                data[index].selected = checked;
            }
        } else {
            data[name].selected = checked;
        }
        this.model.trigger('change:filterdata',this.model);
    },
    sortColumn: function(e) {
        e.preventDefault();
        var e = $(e.target),
            sortAsc = !e.hasClass('asc'),
            sortHeader = e.attr('data-comets-header'),
            filterdata = this.model.get('filterdata');
        e.toggleClass('asc',sortAsc).toggleClass('dsc',!sortAsc).siblings().removeClass('asc').removeClass('dsc');
        filterdata.sort(appComets.sorts.property(sortHeader,sortAsc));
        this.model.set({
            'sortAsc': sortAsc,
            'sortHeader': sortHeader
        });
        this.model.trigger('change:filterdata',this.model);
    },
    startDownload: function (e) {
        e.preventDefault();
        var $that = this;
        if (this.model.get('csv')) {
            appComets.events.preauthenticate(e, function () {
                window.location = $that.model.get('csv');
            });
        }
    },
    render: function () {
        if (this.model.get('correlationRun')) {
            this.$el.html(this.template(this.model.attributes));
            if (this.model.get('status') === true) {
                this.renderTable.apply(this);
            }
        } else {
            this.$el.html('');
        }
    },
    renderTable: function() {
        if (!(this.model.get('correlationRun') && this.model.get('status'))) return;
        var map = this.model.get('filterdata'),
            page = this.model.get('page'),
            tableOrder = this.model.get('tableOrder'),
            entryCount = this.model.get('entryCount');
        this.$el.find('#correlationSummary tbody').empty();
        var tr = '';
        if (map.length > 0 && map.map(function(row) { return row.selected; }).reduce(function(prev,curr) { return prev&&curr; },true)) {
            this.$el.find('#correlationSummary thead input[type="checkbox"]').attr('checked',true);
        } else {
            this.$el.find('#correlationSummary thead input[type="checkbox"]').attr('checked',false);
        }
        for (var index = (page-1)*entryCount; index < Math.min(page*entryCount,map.length); index++) {
            tr += '<tr><th class="text-center" scope="row"><label class="sr-only" for="row-' + index + '">Select metabolite</label><input id="row-' + index + '" type="checkbox" name="'+index+'"'+(map[index].selected?' checked="true"':'')+'/></th>';
            for (var orderIndex in tableOrder) {
                var val = map[index][tableOrder[orderIndex]];
                tr += '<td>'+(val === undefined?"NA":val)+'</td>';
            }
            tr += '</tr>';
        }
        this.$el.find('#correlationSummary tbody').append(tr);
        this.$el.find('#pagingRow').html(this.pagingTemplate(this.model.attributes));
    }
});

appComets.CustomListView = Backbone.View.extend({
    initialize: function() {
        var model = this.model,
            metabolites = {},
            metaboliteIds = model.get('metaboliteIds'),
            metaboliteList = [],
            formModel = model.get('formModel'),
            length = formModel.get('defaultOptions').length;
        model.get('excorrdata').filter(function(entry) { return entry.selected; }).forEach(function(entry) {
            if (metaboliteIds.indexOf(entry.exposurespec) > -1) metabolites[entry.exposurespec] = true;
            if (metaboliteIds.indexOf(entry.outcomespec) > -1) metabolites[entry.outcomespec] = true;
        });
        for (var index in metabolites) {
            metaboliteList.push(index);
        }
        model.set({
            'listName': "custom"+length,
            'metaboliteList': metaboliteList
        });
        this.template = _.template(appComets.templatesList.listDialog);
        this.render();
        model.on({
            'change:listName': this.checkName
        }, this);
        formModel.on({
            'change:defaultOptions': this.rerender
        }, this);
    },
    events: {
        'hidden.bs.modal': 'remove',
        'keyup input[type="text"]': 'updateModel',
        'click button[data-index]': 'removeTag',
        'click button.create': 'createList',
        'click .modal-footer button:not(.create)': 'close'
    },
    close: function(e) {
        e.preventDefault();
        this.$modal.close();
    },
    createList: function(e) {
        e.preventDefault();
        var model = this.model,
            formModel = model.get('formModel'),
            corrModel = model.get('correlationModel'),
            options = formModel.get('defaultOptions');
        options.push({'text':model.get('listName'),'value':model.get('metaboliteList').join(";")});
        this.model.set('metaboliteList',[]);
        _.each(model.get('excorrdata'),function(row,index,list) { row.selected = false; });
        formModel.trigger('change:defaultOptions',formModel);
        corrModel.trigger('change:excorrdata', corrModel);
        corrModel.trigger('change:filterdata', corrModel);
    },
    removeTag: function(e) {
        e.preventDefault();
        var e = $(e.target),
            model = this.model.get('formModel'),
            defaultOptions = model.get('defaultOptions');
        defaultOptions.splice(e.attr('data-index'),1);
        model.trigger('change:defaultOptions',model);
    },
    updateModel: function(e) {
        if (e.keyCode == 13 && !this.$el.find('button.create').attr('disabled')) {
            this.createList.call(this,e);
        } else {
            appComets.events.updateModel.call(this,e);
        }
    },
    checkName: function() {
        var listName = this.model.get('listName'),
            defaultOptions = this.model.get('formModel').get('defaultOptions');
        if (listName === "" || defaultOptions.map(function(entry) { return listName === entry.text; }).reduce(function(prev,curr) { return prev||curr; },false)) {
            this.$el.find('button.create').attr('disabled',true);
        } else {
            this.$el.find('button.create').removeAttr('disabled');
        }
    },
    render: function() {
        this.$modal = BootstrapDialog.show({
            buttons: [{
                'cssClass': 'btn-primary',
                'label': "Close"
            }],
            closable: false,
            message: $(this.template(this.model.attributes)),
            title: "Metabolites Tag"
        });
        this.setElement(this.$modal.getModal());
    },
    rerender: function() {
        $('.bootstrap-dialog-message').html(this.template(this.model.attributes));
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
            'change:plotColorscale': this.render,
            'change:plotHeight': this.render,
            'change:plotWidth': this.render,
            'change:sortRow': this.render,
            'change:sortStratum': this.render
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
            var focusId = $(':focus').attr('id');
            this.$el.html(this.template(this.model.attributes));
            if (focusId) $('#'+focusId).trigger('focus');
            if (this.model.get('status') === true) {
                var sortRow = this.model.get('sortRow'),
                    sortStratum = this.model.get('sortStratum'),
                    exposures = this.model.get('exposures'),
                    correlationData = {};
                _.each(this.model.get('excorrdata'), function (metabolite, key, list) {
                    correlationData[metabolite.outcome] = correlationData[metabolite.outcome] || {
                        'outcome': metabolite.outcome
                    };
                    correlationData[metabolite.outcome][metabolite.exposure] = metabolite.corr;
                    correlationData[metabolite.outcome][metabolite.stratavar] = metabolite.strata;
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
                    if (sortStratum != "All participants (no stratification)") {
                        var strataSort = {};
                        _.each(heatmapData, function (datum) {
                            var stratum = strataSort[datum[sortStratum]]||[];
                            stratum.push(datum);
                            strataSort[datum[sortStratum]] = stratum;
                        });
                        heatmapData = [];
                        for (var prop in strataSort) {
                            heatmapData = heatmapData.concat(strataSort[prop]);
                        }
                    }
                    values = heatmapData.map(function (biochem) {
                        return exposures.map(function (exposure) {
                            return biochem[exposure];
                        });
                    });
                    metaboliteNames = heatmapData.map(function (biochem) {
                        return biochem.outcome;
                    });
                }
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
                    width: plotWidth
                }, exposures, metaboliteNames, "Correlation", values);
            }
        } else {
            this.$el.html('');
        }
    }
});

appComets.HomeView = Backbone.View.extend({
    el: '#tab-home',
    events: {
        'click .clicktab': 'tabTo'
    },
    tabTo: function(e) {
        var e = e.target;
        $('nav a[data-target="'+$(e).attr('href')+'"]').trigger('click');
        return false;
    }
});

appComets.HelpView = Backbone.View.extend({
    el: '#tab-help',
    events: {
        'click .goto': 'scrollToAnchor'
    },
    scrollToAnchor: function(e) {
        var e = e.target;
        var offset = $($(e).attr('href')).offset();
        $('html, body').animate({scrollTop: offset.top},500);
        return false;
    }
});

$(function () {
    appComets.models.cohortsList = new appComets.CohortsModel();
    appComets.models.templatesList = new appComets.TemplatesModel();
    appComets.models.integrityResults = new appComets.IntegrityResultsModel();
    appComets.models.correlationResults = new appComets.CorrelationResultsModel();
    var after3 = _.after(3,function() {
        appComets.CombineFormModel.prototype.defaults.templateList = appComets.models.templatesList.get('templates');
        appComets.models.combineForm = new appComets.CombineFormModel();
        appComets.HarmonizationFormModel.prototype.defaults.cohortList = appComets.models.cohortsList.get('cohorts');
        appComets.models.harmonizationForm = new appComets.HarmonizationFormModel();
        appComets.models.base = new appComets.BaseModel({
            'combineForm': appComets.models.combineForm,
            'harmonizationForm': appComets.models.harmonizationForm,
            'integrityResults': appComets.models.integrityResults,
            'correlationResults': appComets.models.correlationResults,
        });
        appComets.views.baseView = new appComets.BaseView({
            model: appComets.models.base
        });
    }),
    setTitle = function (e) {
        document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
    };
    $('#pageContent').on('show.bs.tab', '#comets-tab-nav', setTitle);
    $('#pageContent').on('show.bs.tab', '#correlate-tab-nav', setTitle);
    templates = $.ajax({
        type: "GET",
        url: "/cometsRest/templates",
    }).then(function (data) {
        // attach templates array to module
        appComets.templatesList = data;
    }).done(after3);
    appComets.models.cohortsList.fetch().done(after3);
    appComets.models.templatesList.fetch().done(after3);

    // enable keyboard accessibility for tabs
    $('[data-toggle="tab"]').keyup(function(e) {
        if (e.originalEvent.keyCode == 13)
            $(this).tab('show');
    });

    // attach form labels to selectize inputs
    Selectize.define('508_compliance', function(options) {
        var self = this;
        this.setup = (function() {
            var original = self.setup;
            return function() {
                original.apply(this, arguments);
                var originalId = this.$input.attr('id');
                var selectizeId = 'selectize-' + originalId;
                this.$control_input.attr('id', selectizeId);
                var label = $('<label class="sr-only"/>')
                    .attr('for', selectizeId)
                    .text('Selectable input for ' + originalId);

                this.$wrapper.append(label);
            };
        })();

    });

    $(window).on('beforeunload', function(e) {

        console.log('called beforeunload');

        var sessionFiles = [
            appComets.models.harmonizationForm.get('rdsFilePath'),
            appComets.models.integrityResults.get('csvDownload'),
            appComets.models.correlationResults.get('csv'),
        ].filter(
            _.isString
        ).map(function(filepath) {
            return filepath.replace(/tmp\//, '')
        });

        $.post('/api/end_session', JSON.stringify(sessionFiles));

        e.returnValue = '';
    });
});
