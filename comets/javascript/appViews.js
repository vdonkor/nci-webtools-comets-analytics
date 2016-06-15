// app namespace
var appComets = {};

Backbone.View.prototype.close = function () {
    if (this.beforeClose) {
        this.beforeClose();
    }
    this.remove();
    this.unbind();
};

// views
appComets.errorsView = Backbone.View.extend({
    el: '#messageDiv',
    initialize: function () {
        if (this.options.errors.length > 0) {
            var messages = this.options.errors.join("<br/>");
            this.template = _.template(messages);
        }
        this.render();
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

appComets.IntegrityView = Backbone.View.extend({
    // should already have element (el) specified, so we don't need to do it again
    initialize: function () {

        var init = this;
        if (init.options.model) {
            getTemplate('integrityCheckResult').then(function (templ) {
                if (templ.length > 0) {

                    integrity = init.model.get("integrity");
                    integrity.statusMessage = "";

                    if (integrity.status)
                        integrity.statusMessage = "Passed all integrity checks, analyses can proceed. If you are part of COMETS, please download metabolite list below and submit to the COMETS harmonization group.";
                    else
                        integrity.statusMessage = "The input file failed the integrity check.";

                    init.template = _.template(templ, {
                        status: integrity.status,
                        statusMessage: integrity.statusMessage,
                        metaboliteSheet: integrity.metaboliteSheet,
                        subjectSheet: integrity.subjectSheet,
                        subjectMetaSheet: integrity.subjectMetaSheet,
                        graph: integrity.graph,
                        nMetabolites: integrity.nMetabolites,
                        nHarmonized: integrity.nHarmonized,
                        nHarmonizedNon: integrity.nHarmonizedNon,
                        dateRun: integrity.dateRun
                    });

                    document.title = "Integrity Check - Welcome to COMETS (COnsortium of METabolomics Studies)";
                }
                init.render();
            });
        }
    },

    render: function () {
        if (this.template.length > 0)
            this.$el.html(this.template);
    },
    events: {
        "click #resultsDownload": 'startDownload'
    },
    startDownload: function (e) {
        alert("starting download");
    }
});

appComets.LandingView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        var init = this;

        // if authorized then go to landing
        if (init.options.attributes && init.options.attributes.authStatus === "connected") {
            getTemplate('landing').then(function (templ) {
                if (templ.length > 0) {
                    init.template = _.template(templ, {
                        user: init.options.attributes.user
                    });

                    document.title = "Welcome to COMETS (COnsortium of METabolomics Studies)";
                }
                init.render();
            });
        } else {
            // if not, logout

        }
    },
    render: function () {
        this.$el.html(this.template);
    },
    events: {
        /**
            "<eventType targetedElement>" : "callbackFunctionName"
        **/
        'show.bs.tab #comets-tab-nav': 'setTitle',
        'show.bs.tab #correlate-tab-nav': 'setTitle',
        //        'change #harmonizationFile': 'uploadQCHarmFile',
        //        'change #mappingFile': 'uploadQCMappingFile',
        //        'change #metaboliteFile': 'uploadMetaFile',
        'change #inputDataFile': 'uploadInputDataFile',
        'change #corr_cutoff': 'updateSlider',
        'change #cohortSelection': function (e) {
            if (e.target.value.length > 0) {
                $("#inputStep2").show();
            } else {
                $("#inputStep2").hide();
            }
        },
        'click #toggleHelp': function () {
            $("#inputHelp").toggle();
        }
    },
    setTitle: function (e) {
//        if($(e.target).hasClass("subnav")){
//            
//            document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
//        }
//        else
            document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
    },
    uploadInputDataFile: function (e) {

        // show upload status using progressbar
        $.when(fileUpload(e)).then(function () {

            // after processing pass object to create new model
            var processedFile = new appComets.fileStats({
                integrity: {
                    status: true,
                    metaboliteSheet: {
                        meta: 19
                    },
                    subjectSheet: {
                        subjects: 19,
                        covariants: 2
                    },
                    subjectMetaSheet: {
                        subjects: 19,
                        meta: 18
                    },
                    nMetabolites: 18,
                    nHarmonized: 18,
                    nHarmonizedNon: 0,
                    graph: {
                        src: "images/integritycheck_graphs.jpg",
                        description: "Description of integrity graph"
                    },
                    dateRun: new Date()
                }
            });

            // create sub views for each section, after file has been processed
            this.integrityView = new appComets.IntegrityView({
                el: this.$("#integrityDiv"),
                model: processedFile
            });

        });

        if (e.target.files.length > 0) {
            $("#inputNotice").hide();
            $("#inputStep3").show();
        } else {
            $("#inputNotice,#inputStep3").show();
            $("#inputStep3").hide();
        }

        $('#summaryDiv').show();
        $('#heatmapDiv').show();
        $('#clusterDiv').show();
        $('#networkDiv').show();
        $('#integrityDiv').show();
    },
    updateSlider: function (e) {
        $("#corr_val").val(e.target.value)
    }
});

appComets.LoginView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        var init = this;
        getTemplate('login').then(function (templ) {
            if (templ.length > 0) {
                init.template = _.template(templ);
                document.title = "Login - COMETS (COnsortium of METabolomics Studies)";
            }
            init.render();
        });
    },
    render: function () {
        this.$el.html(this.template);
    },
    events: {
        /**
            <eventType targetedElement> : callbackFunction
        **/
        'click #signin': 'validateLogin'
    },
    validateLogin: function (e) {
        // check for valid form first then, attempt to authenticate via social network

        var userName = $('#userId');
        var pssword = $('#password');

        var messages = [];

        if (!userName[0].validity.valid || !pssword[0].validity.valid) {
            var unValidity = userName[0].validity;
            var pwValidity = pssword[0].validity;

            if (unValidity.valueMissing || userName.val().trim() == 0) {
                messages.push("User ID is required");
            }

            if (pwValidity.valueMissing || pssword.val() == 0) {
                messages.push("Password is required");
            }
        }

        new appComets.errorsView({
            errors: messages
        });

        // send credentials for validation
        if (messages.length === 0) {

            // carry access token once authenticated, validate token when accessing secure pages
            // use backbone local storage

            //Ex. FB

            checkAuthorized("fb", {
                status: 'connected',
                authResponse: {
                    accessToken: '...',
                    expiresIn: '...',
                    signedRequest: '...',
                    userID: 'a User'
                }
            });
        }
    }
});

function checkAuthorized(authService, authObj) {
    if (authService === "fb") {
        if (authObj.status === 'connected') {
            var authModel = new appComets.authUser({
                authStatus: authObj.status,
                token: authObj.authResponse.accessToken,
                user: authObj.authResponse.userID
            });

            // send model to secure pages
            new appComets.LandingView(authModel);

        } else if (authObj.status === "not_authorized") {
            // trigger not authorized error on login page

            new appComets.LoginView();
            new appComets.errorsView({
                errors: "You are not authorized to access this application"
            });
        }
    }
}

function getTemplate(templName) {
    return $.get('templates/' + templName + '.html', function (data) {
        return data;
    });
}

function fileUpload(e) {
    if (window.FileReader) {
        var file = e.target.files[0];
        var reader = new FileReader();

        reader.onload = function (event) {
            var contents = event.target.result;
        }

        if (file) {
            reader.readAsText(file);
            file1 = file;
        }
    }
}

function buildDataTable(el, tableData) {
    $(el).DataTables({
        data: tableData,
    });
}

$(function () {

    // eventually refer to some type of session variable to check whether they are already authorized and authenticated

    //load login at first
    var loginView = new appComets.LoginView();
});