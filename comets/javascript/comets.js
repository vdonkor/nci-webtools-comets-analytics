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

function generateHistogram(el, xTitle, graphTitle, data) {
    Plotly.newPlot(el, [{
        x: data,
        type: "histogram"
    }], {
        margin: {
            l: 50,
            t:100
        },
        title: graphTitle,
        xaxis: {
            title: xTitle,
            showgrid: false
        },
        yaxis: {
            title: "Frequency"
        }
    });
}

function generateHeatmap (el, xLabels, yLabels, graphTitle, data){
    Plotly.newPlot(el, [{
        x: xLabels,
        y: data,
        type: 'heatmap',
        colorbar: {
            
        }
    }], {
        title: graphTitle
    });
}

$(function () {
    var baseView = new appComets.LandingView();
});