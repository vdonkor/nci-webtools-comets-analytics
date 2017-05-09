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
        var createTree = function(root, label) {
            if (!('branch' in root)) {
                return {
                    depth: 0,
                    height: label.indexOf(root.label)
                };
            }
            var children = [];
            var bottom = Number.POSITIVE_INFINITY;
            var depth = 1;
            var top = Number.NEGATIVE_INFINITY;
            for (var index = 0; index < root.branch.length; index++) {
                var branch = createTree(root.branch[index],label);
                if ('height' in branch) children.push(branch);
                bottom = Math.min(bottom,branch.height);
                depth = Math.max(depth,branch.depth+1);
                top = Math.max(top,branch.height);
            }
            var node = {
                bottom: bottom,
                depth: depth,
                height: (bottom+top)/2,
                top: top
            };
            if (children.length > 0) node.children = children;
            return node;
        };
        var createShapes = function(node,base,count,depth,orientation) {
            var direction = orientation=='x' ? 1 : -1;
            var adjustedDepth = base-.5+(direction*depth*count/40);
            var shapes = [];
            var template = {
                line: {
                  color: 'rgb(191,191,191)',
                  width: 1
                },
                type: 'line',
                x0: adjustedDepth,
                x1: adjustedDepth,
                y0: adjustedDepth,
                y1: adjustedDepth
            }
            if ('bottom' in node && 'top' in node) {
                var shape = $.extend({},template);
                shape[orientation+'0'] = node.bottom;
                shape[orientation+'1'] = node.top;
                shapes.push(shape);
            }
            for (var a = 0; a < (node.children||[]).length; a++) {
                shapes = shapes.concat(createShapes(node.children[a],base,count,depth-1,orientation));
                var shape = $.extend({},template,{
                    x1: node.children[a].children ? adjustedDepth-(direction*count/40) : adjustedDepth-(direction*depth*count/40),
                    y1: node.children[a].children ? adjustedDepth-(direction*count/40) : adjustedDepth-(direction*depth*count/40)
                });
                shape[orientation+'0'] = node.children[a].height;
                shape[orientation+'1'] = node.children[a].height;
                shapes.push(shape);
            }
            return shapes;
        };
        var shapes = [];
        if (options.clustered) {
            var row = createTree(options.clustered.rowTree,yLabels);
            shapes = shapes.concat(createShapes(row,0,xLabels.length,row.depth,'y'));
            var col = createTree(options.clustered.colTree,xLabels);
            shapes = shapes.concat(createShapes(col,yLabels.length,yLabels.length,col.depth,'x'));
        }
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
            }).reduce(minmax,{min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY});
        }).reduce(minmax,{min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY});
        avg = (avg.min+avg.max)/2;
        return Plotly.newPlot(el, [{
            z: data,
            x: xLabels,
            y: yLabels,
            type: 'heatmap',
            colorbar: {
                x: options.clustered ? 1.5 : 1.02,
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
                },[]) : null,
            autosize: true,
            height: options.height,
            legend: {
                title: legendLabel
            },
            margin: {
                t: 32,
                b: Math.min(175,Math.max(50,7*xLabels.map(function(e) { return e.length; }).reduce(function(prev,curr) { return Math.max(prev,curr); },0))),
                l: options.clustered ? 0 : Math.min(175,Math.max(50,7*yLabels.map(function(e) { return e.length; }).reduce(function(prev,curr) { return Math.max(prev,curr); },0)))
            },
            width: options.width,
            shapes: shapes,
            title: " ",
            xaxis: {
                showgrid: false,
                ticks: '',
                title: " "
            },
            yaxis: {
                showgrid: false,
                side: options.clustered ? 'right' : 'left',
                ticks: '',
                title: " "
            }
        });
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
    