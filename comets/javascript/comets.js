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

function generateDataTable(el, dtData, dtCols) {
    var table = $("<table></table>");

    el.empty().append(table);

    el.find("table").DataTable({
        dom: '<"top"i>rt<"bottom"flp><"clear">',
        data: dtData,
    });
}

function generateHistogram(el, xLabels, yLabels, graphTitle, data) {
    Plotly.newPlot(el, [{
        x: data,
        type: 'histogram'
    }], {
        margin: {
            l: 50,
            t: 100
        },
        title: graphTitle,
        xaxis: {
            title: xLabels,
            showgrid: false
        },
        yaxis: {
            title: yLabels
        }
    });
}

function generateHeatmap(el, xLabels, yLabels, legendLabel, minVal, maxVal, data) {
    Plotly.newPlot(el, [{
        transpose: true,
        z: data,
        //        x: xLabels,
        y: yLabels,
        type: 'heatmap',
        colorscale: "Viridis",
        colorbar: {
            title: legendLabel
        },
        zmax: maxVal,
        zmin: minVal,
        text: yLabels,
        height: 500,
        connectgaps: true
    }], {
        margin: {
            l: 200
        },
        autosize: true,
        xaxis: {
            title: "Age",
            showgrid: false
        }
    });
}

$(function () {
    var baseView = new appComets.LandingView();
});