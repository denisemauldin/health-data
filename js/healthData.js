// This shouldn't be hard coded, but there are limitations to the google spreadsheet api
var readableString = {
    "mycurrentskintemperature": "My Current Skin Temperature",
    "howmanyhoursofsleepdidyouhavelastnight": "How many hours of sleep did you have last night?",
    "didyoueatbreakfastthismorning": "Did you eat breakfast this morning?",
    "iam": "Birth Sex"
}

function addSelectBox(parentId, opts, elemId, selectedVal, label) {
    var parent = document.getElementById(parentId);
    var selectElement = document.createElement("select");
    selectElement.setAttribute("id", elemId);
    for (var i = 0; i < opts.length; i++) {
        var option = new Option(readableString[opts[i]], opts[i])
        selectElement.options[selectElement.options.length] = option;
    }
    var labelElem = document.createElement("label");
    labelElem.setAttribute("for", elemId);
    labelElem.innerHTML = label
    selectElement.value = selectedVal
    parent.appendChild(labelElem);
    parent.appendChild(selectElement);

}
var removeKeys = ["rowNumber", "iunderstandthattheinformationisubmitwillbeavailabletothegeneralpublic.", "timestamp"]
var margin = {
        top: 40,
        right: 20,
        bottom: 40,
        left: 40
    },
    width = 800 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom,
    padding = 1,
    radius = 6;


// so long, so messy
function showInfo(gData, tableTop, xKey, yKey) {
    xKey = xKey || "didyoueatbreakfastthismorning";
    yKey = yKey || "mycurrentskintemperature";
    // make the table
    tableOptions = {
        "data": gData,
        "tableDiv": "#healthDataTable"
    }
    Sheetsee.makeTable(tableOptions)
    Sheetsee.initiateTableFilter(tableOptions)

    // create the scatterplot categories
    var categories = {}
    var counts = {}
    var keys = Object.keys(gData[0])
    removeKeys.forEach(function(rm) {
        var rmIdx = keys.indexOf(rm)
        keys.splice(rmIdx, 1)
    });
    keys.forEach(function(key) {
        categories[key] = []
        counts[key] = []
    });

    // setup x - did you eat breakfast this morning
    var xValue = function(d) {
            return d[xKey];
        }, // data -> value
        xScale = d3.scale.ordinal().rangePoints([0, width - 5], 1), // value -> display
        xMap = function(d) {
            return xScale(xValue(d));
        }, // data -> display
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");

    // setup y - my current skin temperature
    //var yKey = "howmanyhoursofsleepdidyouhavelastnight";
    var yValue = function(d) {
            return d[yKey]
        }, // data -> value
        yScale = d3.scale.ordinal().rangePoints([0, height - 5], 1), // value -> display
        yMap = function(d) {
            return yScale(yValue(d));
        }, // data -> display
        yAxis = d3.svg.axis().scale(yScale).orient("left");
    // setup fill color - Sex
    var cValue = function(d) {
            return d.iam;
        },
        color = d3.scale.category10();
    var force = d3.layout.force()
        .nodes(gData)
        .size([width, height])
        .on("tick", tick)
        .charge(-1)
        .gravity(0)
        .chargeDistance(20);
    // add a selectbox for the xAxis key
    addSelectBox("hdControls", keys, "xAxisSelect", xKey, "X Axis:");
    addSelectBox("hdControls", keys, "yAxisSelect", yKey, "Y Axis:");
    document.getElementById("xAxisSelect").addEventListener("change", changeAxis);
    document.getElementById("yAxisSelect").addEventListener("change", changeAxis);

    function changeAxis(t) {
        var xSelect = document.getElementById("xAxisSelect");
        var xNKey = xSelect[xSelect.selectedIndex].value;
        var ySelect = document.getElementById("yAxisSelect");
        var yNKey = ySelect[ySelect.selectedIndex].value;
        updateInfo(gData, tableTop, categories[xNKey], categories[yNKey], xNKey, yNKey)
    }

    // add the graph canvas to the body of the webpage
    var svg = d3.select("#hdScatter").append("svg")
        .attr("class", "scatter")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add the tooltip area to the webpage
    var tooltip = d3.select("#hdScatter").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);


    gData.forEach(function(d) {
        keys.forEach(function(key) {
            if (d.hasOwnProperty(key)) {
                if (!categories[key].includes(d[key])) {
                    categories[key].push(d[key])
                }
                if (!counts[key].hasOwnProperty(d[key])) {
                    counts[key][d[key]] = 1
                } else {
                    counts[key][d[key]] += 1
                }
            }
        });
    });
    yScale.domain(categories[yKey])
    xScale.domain(categories[xKey])


    // x-axis
    svg.append("g")
        .attr("class", "xAxis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "xAxisLabel")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Did you eat breakfast this morning?");

    // y-axis
    svg.append("g")
        .attr("class", "yAxis")
        .call(yAxis)
        .selectAll("text")
        .attr("transform", "rotate(90)")
        .attr("dx", 10)
        .attr("y", 20)
        .style("text-anchor", "middle")

    svg.select(".yAxis")
        .append("text")
        .attr("transform", "rotate(90)")
        .attr("class", "yAxisLabel")
        .attr("y", -10)
        .style("text-anchor", "start")
        .text(readableString[yKey])

    // draw dots
    var node = svg.selectAll(".dot")
        .data(gData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", radius)
        .attr("cx", xMap)
        .attr("cy", yMap)
        .style("fill", function(d) {
            return color(cValue(d));
        })
        .on("mouseover", function(d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(d.iam + "<br/> (" + d[xKey] +
                    " - " + counts[xKey][d[xKey]] + ")<br/>" +
                    "(" + d[yKey] + " - " + counts[yKey][d[yKey]] + ")")
                .style("left", (d3.event.pageX + 5) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // draw legend
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
        });

    // draw legend colored rectangles
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    // draw legend text
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) {
            return d;
        })

    force.start()
    gData.forEach(function(d) {
        d.x = xScale(d[xKey]);
        d.y = yScale(d[yKey]);
        d.color = color(d.iam);
        d.radius = radius;
    });

    function tick(e) {
        node.each(moveTowardDataPosition(e.alpha));

        node.each(collide(e.alpha));

        node.attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            });
    }

    function moveTowardDataPosition(alpha) {
        return function(d) {
            d.x += (xScale(d[xKey]) - d.x) * 0.1 * alpha;
            d.y += (yScale(d[yKey]) - d.y) * 0.1 * alpha;
        };
    }

    // Resolve collisions between nodes.
    function collide(alpha) {
        var quadtree = d3.geom.quadtree(gData);
        return function(d) {
            var r = d.radius + radius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }
} // end showInfo

function updateInfo(gData, tableTop, xDomain, yDomain, xKey, yKey) {
    var xValue = function(d) {
            return d[xKey];
        },
        xScale = d3.scale.ordinal().rangePoints([0, width - 5], 1),
        xMap = function(d) {
            return xScale(xValue(d));
        },
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");

    var yValue = function(d) {
            return d[yKey]
        },
        yScale = d3.scale.ordinal().rangePoints([0, height - 5], 1),
        yMap = function(d) {
            return yScale(yValue(d));
        },
        yAxis = d3.svg.axis().scale(yScale).orient("left");

    var force = d3.layout.force()
        .nodes(gData)
        .size([width, height])
        .on("tick", tick)
        .charge(-1)
        .gravity(0)
        .chargeDistance(20);

    // setup fill color - Sex
    var cValue = function(d) {
            return d.iam;
        },
        color = d3.scale.category10();

    xScale.domain(xDomain)
    yScale.domain(yDomain)

    var svg = d3.select("#hdScatter").transition();

    svg.select(".yAxis")
        .duration(750)
        .call(yAxis)
        .selectAll("text")
        .attr("transform", "rotate(90)")
        .attr("dx", 10)
        .attr("y", 20)
        .style("text-anchor", "middle")

    svg.select(".yAxisLabel")
        .attr("transform", "rotate(90)")
        .attr("y", -10)
        .style("text-anchor", "start")
        .text(readableString[yKey])

    svg.select(".xAxis")
        .duration(750)
        .call(xAxis)

    svg.select(".xAxisLabel")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(readableString[xKey]);

    var node = d3.selectAll(".dot")
        .data(gData)
    force.start();

    function tick(e) {
        node.each(moveTowardDataPosition(e.alpha));

        node.each(collide(e.alpha));

        node.attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            });
    }

    function moveTowardDataPosition(alpha) {
        return function(d) {
            d.x += (xScale(d[xKey]) - d.x) * 0.1 * alpha;
            d.y += (yScale(d[yKey]) - d.y) * 0.1 * alpha;
        };
    }

    // Resolve collisions between nodes.
    function collide(alpha) {
        var quadtree = d3.geom.quadtree(gData);
        return function(d) {
            var r = d.radius + radius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

}
