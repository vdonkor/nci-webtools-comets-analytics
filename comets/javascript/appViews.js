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

appComets.IntegrityView = Backbone.View.extend({
    // should already have element (el) specified, so we don't need to do it again
    initialize: function () {

        var init = this;
        if (init.options.model) {
            getTemplate('integrityCheckResult').then(function (templ) {
                if (templ.length > 0) {

                    integrity = init.model.get("integrity");

                    init.template = _.template(templ, {
                        status: integrity.status,
                        statusMessage: integrity.statusMessage,
                        metaboliteSheet: integrity.metaboliteSheet,
                        subjectSheet: integrity.subjectSheet,
                        subjectMetaSheet: integrity.subjectMetaSheet,
                        graph: integrity.graph,
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
        'change #inputDataFile': 'uploadInputDataFile',
        'change #corr_cutoff': 'updateCorrelation',
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
        document.title = e.target.text + " - Welcome to COMETS (COnsortium of METabolomics Studies)";
    },
    uploadInputDataFile: function (e) {
        $this = this;// get the current view object
        
        var formData = new FormData();

        // show upload status using progressbar
        file = fileUpload(e);

        if (file) {
            formData.append("inputFile", file);

            $.ajax({
                type: "POST",
                url: "/cometsRest/correlate/integrity",
                data: formData,
                dataType: "json",
                cache: false,
                processData: false,
                contentType: false,
                beforeSend: function () {
                    $("#calcProgressbar").show().find("[role='progressbar']").addClass("active");
                }
            }).fail(function () {
                $("#calcProgressbar [role='progressbar']").addClass("progress-bar-danger").text("Upload Failed!");
            }).then(function (data, statusText, xhr) {
                
                $("#calcProgressbar [role='progressbar']").removeClass("progress-bar-danger").addClass("progress-bar-success").text("Upload Complete");
                // after processing pass object to create new model
                var processedFile = new appComets.fileStats({
                    integrity: {
                        status: statusText === "success" ? true: false,
                        statusMessage: data.statusMessage,
                        metaboliteSheet: data.metabolite,
                        subjectSheet: data.subject,
                        subjectMetaSheet: data.subjectMeta,
                        graph: {
                            src: "images/integritycheck_graphs.jpg",
                            description: "Description of integrity graph"
                        },
                        dateRun: new Date()
                    }
                });

                // create sub views for each section, after file has been processed
                $this.integrityView = new appComets.IntegrityView({
                    el: $this.$("#integrityDiv"),
                    model: processedFile
                });

                if (e.target.files.length > 0) {
                    $("#inputNotice").hide();
                    $("#inputStep3").show();
                } else {
                    $("#inputNotice,#inputStep3").show();
                }

                $("#inputStep3").hide();
                $('#summaryDiv').show();
                $('#heatmapDiv').show();
                $('#clusterDiv').show();
                $('#networkDiv').show();
                $('#integrityDiv').show();
            }).always(function () {
                $("#calcProgressbar [role='progressbar']").removeClass("active");
            });
        }
    },
    updateCorrelation: function (e) {
        $("#corr_val").val(e.target.value);
        console.log("correlation cutoff: " + e.target.value);
        
        // ajax request to generate updated image
        
        
    }
});

appComets.LoginView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        var init = this;
        this.errorsView = new appComets.ErrorsView();

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
        } else {
            this.errorsView({
                errors: messages
            });
        }
    }
});