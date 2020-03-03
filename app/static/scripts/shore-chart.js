function createShoreChart(feature, futureFeature) {
  console.log('feature shore',  feature,  futureFeature)
  var elementId = 'chart-container' ;

  // data from global shore json file (single location)
  var properties = feature.properties;
  var intercept = properties.intercept;
  var dt = properties.dt;
  var dist = properties.distances;

  var data = [];
  $.each(dist, function( index, value ) {
    var item = {};
    item.value = dist[index] - intercept;
    item.dt = dt[index];
    item.date = new Date(1984 + dt[index], 0, 1);
    if (dist[index] === -999) {
      return;
    }
    data.push(item);
  });

  // D3js time series chart
  var margin = {top: 20, right: 20, bottom: 40, left: 60},
      width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  // Set the ranges
  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  // Define the axes
  var xAxis = d3.svg.axis().scale(x)
      .orient("bottom").ticks(10);

  var yAxis = d3.svg.axis().scale(y)
      .orient("left").ticks(5);

  // Define the regression
  var abLine = d3.svg.line()
      .x(function (d) {
        return x(d.date);
      })
      .y(function (d) {
        return y(d.dt * feature.properties.change_rate);
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

  var focus = svg.append("g")
      .style("display", "none");

  // Scale the range of the data
  var xExtent = d3.extent(data, function (d) {
    return d.date;
  })

  if (futureFeature) {
    // extent to future
    xExtent[1] = new Date(2100, 1, 1)
  }

  var yExtent = d3.extent(data, function (d) {
    return d.value;
  })

  if (futureFeature) {
    // update y Extent
    let properties = futureFeature.properties
    let allProps = Object.keys(properties).filter(function(key) { return key.includes('lt')})
    let allValues = allProps.map(function(key) {return properties[key]})
    allValues.push(0)

    let ymin = Math.min(...allValues, yExtent[0])
    let ymax = Math.max(...allValues, yExtent[1])
    // update yExtent
    yExtent = [ymin, ymax]

  }


  x.domain(xExtent);
  y.domain();

  var lineGroup = svg.append("g");
  lineGroup
    .attr("class", "abline")
    .append("path")
    .attr('d', abLine(data));


  // Add the dotsh.
  svg.append("g")
    .attr("class", "dots")
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(d.value) + ")"; })
    .attr("d", d3.svg.symbol()
          .size(40));


  // Add the X Axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("x", width)
    .attr("y", -3)
    .attr("dy", "-.35em")
    .style("font-weight", "bold")
    .style("text-anchor", "middle")
    .text("time");

  // Add the Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("x", 6)
    .attr("dy", ".35em")
    .style("font-weight", "bold")
    .text("shoreline position [m]");

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



function createFutureShorelineChart(feature) {
  console.log('feature', feature)
  var elementId = 'chart-container' ;

  // data from global shore json file (single location)
  var properties = feature.properties;


  // D3js time series chart
  var margin = {top: 20, right: 20, bottom: 40, left: 60},
      width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

  // Set the ranges
  var x = d3.scale.linear().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  // Define the axes
  var xAxis = d3.svg.axis().scale(x)
      .orient("bottom").ticks(10);

  var yAxis = d3.svg.axis().scale(y)
      .orient("left").ticks(5);


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

  var focus = svg.append("g")
      .style("display", "none");

  // Scale the range of the data
  x.domain([2020, 2100]);

  var allProps = Object.keys(properties).filter(function(key) { return key.includes('lt')})
  var allValues = allProps.map(function(key) {return properties[key]})
  allValues.push(0)

  var ymin = Math.min(...allValues)
  var ymax = Math.max(...allValues)
  y.domain([ymin, ymax]);


  var area = d3.svg.area()
      .interpolate("linear")
      .x( function(d) { return x(d.x) } )
      .y0( function(d) { return y(d.y0) } )
      .y1(  function(d) { return y(d.y1) } );

  var line = d3.svg.line()
      .interpolate("linear")
      .x( function(d) { return x(d.x) } )
      .y(  function(d) { return y(d.y) } );

  var sl45perc50 = [
    {x: 2020, y: 0},
    {x: 2050, y: properties['50lt452050']},
    {x: 2100, y: properties['50lt452100']}
  ]
  var sl85perc50 = [
    {x: 2020, y: 0},
    {x: 2050, y: properties['50lt852050']},
    {x: 2100, y: properties['50lt852100']}
  ]
  var sl45perc66 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['17lt452050'], y1: properties['83lt452050']},
    {x: 2100, y0: properties['17lt452100'], y1: properties['83lt452100']},
  ]
  var sl85perc66 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['17lt852050'], y1: properties['83lt852050']},
    {x: 2100, y0: properties['17lt852100'], y1: properties['83lt852100']},
  ]
  var sl45perc90 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['5lt452050'], y1: properties['95lt452050']},
    {x: 2100, y0: properties['5lt452100'], y1: properties['95lt452100']},
  ]
  var sl85perc90 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['5lt852050'], y1: properties['95lt852050']},
    {x: 2100, y0: properties['5lt852100'], y1: properties['95lt852100']},
  ]
  var sl45perc98 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['1lt452050'], y1: properties['99lt452050']},
    {x: 2100, y0: properties['1lt452100'], y1: properties['99lt452100']},
  ]
  var sl85perc98 = [
    {x: 2020, y0: 0, y1: 0},
    {x: 2050, y0: properties['1lt852050'], y1: properties['99lt852050']},
    {x: 2100, y0: properties['1lt852100'], y1: properties['99lt852100']},
  ]
  // svg.append("g")
  //   .attr("class", "ci sl45")
  //   .append('path')
  //   .datum(sl45perc66)
  //   .attr('class', 'area')
  //   .attr('d', area);
  // svg.append("g")
  //   .attr("class", "ci sl85")
  //   .append('path')
  //   .datum(sl85perc66)
  //   .attr('class', 'area')
  //   .attr('d', area);
  svg.append("g")
    .attr("class", "ci sl45")
    .append('path')
    .datum(sl45perc90)
    .attr('class', 'area')
    .attr('d', area);
  svg.append("g")
    .attr("class", "ci sl85")
    .append('path')
    .datum(sl85perc90)
    .attr('class', 'area')
    .attr('d', area);
  // svg.append("g")
  //   .attr("class", "ci sl45")
  //   .append('path')
  //   .datum(sl45perc98)
  //   .attr('class', 'area')
  //   .attr('d', area);
  // svg.append("g")
  //   .attr("class", "ci sl85")
  //   .append('path')
  //   .datum(sl85perc98)
  //   .attr('class', 'area')
  //   .attr('d', area);

  svg.append("g")
    .attr("class", "ci sl45")
    .append('path')
    .datum(sl45perc50)
    .attr('class', 'line')
    .attr('d', line);
  svg.append("g")
    .attr("class", "ci sl85")
    .append('path')
    .datum(sl85perc50)
    .attr('class', 'line')
    .attr('d', line);



  // Add the X Axis
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .attr("x", width)
    .attr("y", -3)
    .attr("dy", "-.35em")
    .style("font-weight", "bold")
    .style("text-anchor", "middle")
    .text("time");

  // Add the Y Axis
  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("x", 6)
    .attr("dy", ".35em")
    .style("font-weight", "bold")
    .text("shoreline position [m]");

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
