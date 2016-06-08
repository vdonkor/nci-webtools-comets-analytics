// app namespace
var appComets = {};


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

// call this view within every other page view to set the document title element text
appComets.docTitleView = Backbone.View.extend({
    el: 'title',
    initialize: function () {
        if (this.options.pageTitle) {
            this.template = _.template(this.options.pageTitle);
            this.render();
        }
    },
    render: function () {
        this.$el.html(this.template);
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

                    new appComets.docTitleView({
                        pageTitle: "Welcome to COMETS (COnsortium of METabolomics Studies)"
                    });

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
        'show.bs.tab #comets-tab-nav': 'setupPage',
        'change #harmonizationFile': 'uploadQCHarmFile',
        'change #mappingFile': 'uploadQCMappingFile',
        'change #metaboliteFile': 'uploadMetaFile',
        'change #inputDataFile': 'uploadInputDataFile'
    },
    setupPage: function () {

    },
    uploadQCHarmFile: function (e) {
        fileUpload(e);
        $('#qualityControlResult').show();
    },
    uploadQCMappingFile: function (e) {
        fileUpload(e);
        $('#qualityControlResult').show();
    },
    uploadMetaFile: function (e) {
        fileUpload(e);
        $('#harmonizationDiv').show();
    },
    uploadInputDataFile: function (e) {
        fileUpload(e);
        $('#summaryDiv').show();
        $('#heatmapDiv').show();
        $('#clusterDiv').show();
        $('#networkDiv').show();
    }
});

appComets.LoginView = Backbone.View.extend({
    el: '#pageContent',
    initialize: function () {
        var init = this;
        getTemplate('login').then(function (templ) {
            if (templ.length > 0) {
                init.template = _.template(templ);

                new appComets.docTitleView({
                    pageTitle: "Login - COMETS (COnsortium of METabolomics Studies)"
                });
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

$(function () {
    //load login at first
    var loginView = new appComets.LoginView();

    // eventually refer to some type of session variable to check whether they are already authorized and authenticated
});
