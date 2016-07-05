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

function generateDataTable(el, dtData, dtCols) {
    var table = $("<table></table>");

    el.empty().append(table);

    el.find("table").DataTable({
        dom: '<"top"i>rt<"bottom"flp><"clear">',
        data: dtData,
    });

}

$(function () {
    var baseView = new appComets.LandingView();
});