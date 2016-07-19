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

function generateBarPlots(el, xLabels, yLabels, graphTitle, data) {
    Plotly.newPlot(el, [{
        x: xLabels,
        y: data,
        type: 'bar'
    }], {
        title: graphTitle,
        showlegend: false
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