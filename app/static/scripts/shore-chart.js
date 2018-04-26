function createShoreChart(json) {

  var elementId = 'chart-container' ;

  // data from global shore json file (single location)
  var props = json.properties;
  var intercept = props.intercept;
  var dt = props.dt;
  var dist = props.distances;

  var data = [];
  $.each(dist, function( index, value ) {
    var item = {};
    item.value = dist[index] - intercept;
    item.date = new Date(1984 + dt[index], 0, 1);
    if (dist[index] === -999) {
      return;
    }
    data.push(item);
  });

  // D3js time series chart
  var margin = {top: 20, right: 20, bottom: 20, left: 40},
    width = 600 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

  // Set the ranges
  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  // Define the axes
  var xAxis = d3.svg.axis().scale(x)
    .orient("bottom").ticks(10);

  var yAxis = d3.svg.axis().scale(y)
    .orient("left").ticks(5);

  // Define the line
  var valueline = d3.svg.line()
    .x(function (d) {
      return x((d.date));
    })
    .y(function (d) {
      return y(d.value);
    });

  // clear content
  d3.select('#' + elementId)
    .selectAll('*')
    .remove();

    // Adds the svg canvas
  var svg = d3.select("#"+ elementId)
    .append("svg")
    .classed({'query-chart': true})
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

  // var tip = d3.tip()
  //   .attr('class', 'd3-tip')
  //   .offset([-10, 0])
  //   .html(function (d) {
  //     return 'Date: ' + formatDate(d.date) + ', Value: ' + d.value;
  //   });

  // svg.call(tip);

  var lineSvg = svg.append("g");

  var focus = svg.append("g")
    .style("display", "none");

  // Scale the range of the data
  x.domain(d3.extent(data, function (d) {
    return d.date;
  }));
  y.domain(d3.extent(data, function (d) {
    return d.value;
  }));

  // Add the dotsh.
    svg.append("g")
    .attr("class", "dots")
    .selectAll("path")
    .data(data)
    .enter().append("path")
    .attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(d.value) + ")"; })
    .attr("d", d3.svg.symbol()
    .size(40));


  // Add the X Axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  // Add the Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // append the x line
  focus.append("line")
    .attr("class", "x")
    .style("stroke", "blue")
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0.5)
    .attr("y1", 0)
    .attr("y2", height);

  // append the y line
  focus.append("line")
    .attr("class", "y")
    .style("stroke", "blue")
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0.5)
    .attr("x1", width)
    .attr("x2", width);
}
