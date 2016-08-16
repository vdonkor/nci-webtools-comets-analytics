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

    appComets.generateHeatmap = function (el, options, xLabels, yLabels, legendLabel, data) {
        var minmax = function(prev,curr) {
            return {
                min: Math.min(prev.min,curr.min),
                max: Math.max(prev.max,curr.max)
            };
        };
        var avg = data.map(function(e) {
            return e.map(function(e2) {
                return {
                    min: e2,
                    max: e2
                };
            }).reduce(minmax);
        }).reduce(minmax);
        avg = (avg.min+avg.max)/2;
        return Plotly.newPlot(el, [{
            z: data,
            x: xLabels,
            y: yLabels,
            type: 'heatmap',
            colorbar: {
                title: legendLabel
            },
            colorscale: options.colorscale
        }], {
            annotations: options.annotated ? data.map(function(e,y) {
                return e.map(function(e2,x) {
                    return {
                        xref: 'x1',
                        yref: 'y1',
                        x: xLabels[x],
                        y: yLabels[y],
                        text: e2,
                        showarrow: false,
                        font: {
                            family: 'Arial',
                            size: 12,
                            color: e2 > avg ? 'rgb(0,0,0)' : 'rgb(255,255,255)'
                        }
                    };
                });
            }).reduce(function(prev,curr) {
                return prev.concat(curr);
            }) : null,
            margin: {
                t: 32,
                l: 200
            },
            height: options.height,
            width: options.width,
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

    appComets.requestFail = function (xhr, textStatus, errorThrown) {
        appComets.views.errorsDisplay = new appComets.ErrorsView({
            errors: [textStatus, errorThrown]
        });

        appComets.views.errorsDisplay.render();
    };

    appComets.validation = {
        rules: {
            inputDataFile: {
                //required: true,
                accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,"
            },
            cohortSelection: {
                required: true
            },
            methodSelection: {
                required: true
            },
            modelSelection: {
                required: {
                    depends: function (el) {
                        return (appComets.models.harmonizationForm.get("methodSelection") == appComets.models.harmonizationForm.defaults.methodSelection) || (appComets.models.harmonizationForm.get("modelSelection").length <= 0);
                    }
                }
            },
            outcome: {
                required: {
                    depends: function (el) {
                        return (appComets.models.harmonizationForm.get("methodSelection") == "Interactive") && (appComets.models.harmonizationForm.get("outcome") === appComets.models.harmonizationForm.defaults.outcome || appComets.models.harmonizationForm.get("outcome").length <= 0);
                    }
                }
            },
            exposure: {
                required: {
                    depends: function (el) {
                        return (appComets.models.harmonizationForm.get("methodSelection") == "Interactive") && (appComets.models.harmonizationForm.get("exposure") === appComets.models.harmonizationForm.defaults.exposure || appComets.models.harmonizationForm.get("exposure").length <= 0);
                    }
                }
            }
        },
        messages: {
            inputDataFile: {
//                required: "an input file is required",
                accept: "You must upload an Excel workbook file (.xls, .xlsx)"
            },
            cohortSelection: {
                required: "A Cohort must be selected"
            },

            modelSelection: {
                required: "You must choose an existing 'Model' in order to run the model using the 'Batch' method"
            },
            methodSelection: {
                required: "Method Of Analysis is required"
            },
            outcome: {
                required: "You must select at least one metabolite for the 'Outcomes' in order to run the model using the 'Interactive' method"
            },
            exposure: {
                required: "You must select at least one metabolite for the 'Exposures' in order to run the model using the 'Interactive' method"
            }
        },
        highlightElement: function (element, errorClass, validClass) {
            if (element.type != "radio") {
                $(element).addClass(errorClass).removeClass(validClass);
            }
            $(element.form).find("label[for='" + element.name + "']")
                .addClass(errorClass);
        },
        unhighlightElement: function (element, errorClass, validClass) {
            if (element.type != "radio") {
                $(element).removeClass(errorClass).addClass(validClass);
            }
            $(element.form).find("label[for='" + element.name + "']")
                .removeClass(errorClass);
        },
        validationFail: function (event, validator) {
            console.log(validator);
//appComets.views.errorsDisplay({errors});
        },
        validSuccess: function (form) {
            $('#error').empty().css('display', 'none');
            $('#result').empty();
            $('.error').removeClass('error');
        }
    };
