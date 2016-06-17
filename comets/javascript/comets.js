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
    }).fail(function () {
        console.log("Cannot load template. Not found.");
        return errorView("Cannot load template. Not found.");
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
            return file;
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