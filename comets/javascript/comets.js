    appComets.showLoader = function () {
        $("#loader").addClass('show');
    };

    appComets.hideLoader = function () {
        $("#loader").removeClass('show');
    };

    appComets.fileUpload = function (e) {
        if (window.FileReader) {
            var file = e.target.files[0];
            var reader = new FileReader();

            reader.onload = function (event) {
                var contents = event.target.result;
            };

            if (file) {
                reader.readAsText(file);
                return file;
            }
        }
    };

    appComets.generateDataTable = function (el, dtData, dtCols) {
        var table = $("<table></table>");

        el.empty().append(table);

        el.find("table").DataTable({
            dom: '<"top"i>rt<"bottom"flp><"clear">',
            data: dtData,
            responsive: true,
            colReorder: true,
            scroller: true,
            scrollY: 200
        });
    };

    appComets.generateHistogram = function (el, xLabels, yLabels, graphTitle, data) {
        Plotly.newPlot(el, [{
            x: data,
            type: 'histogram'
    }], {
            title: graphTitle,
            xaxis: {
                title: xLabels,
                showgrid: false
            },
            yaxis: {
                title: yLabels
            }
        });
    };

    appComets.generateHeatmap = function (el, height, xLabels, yLabels, legendLabel, data) {
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
            margin: {
                t: 0,
                l: 200
            },
            height: height,
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
    };