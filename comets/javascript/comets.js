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

function generateHeatmap(el, height, xLabels, yLabels, legendLabel, data) {
    Plotly.newPlot(el, [{
        z: data,
        x: xLabels,
        y: yLabels,
        type: 'heatmap',
        colorbar: {
            title: legendLabel
        },
        colorscale: "Viridis"
    }], {
        height: height,
        margin: {
            t: 32,
            l: 200
        },
        title: " ",
        xaxis: {
            title: " ",
            showgrid: false
        },
        yaxis: {
            title: " "
        },
        legend: {
            title: legendLabel
        },
        autosize: true
    });
}