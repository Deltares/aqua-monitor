/**
 * Here we get the mapid and token for the map tiles that were generated
 * by Earth Engine using the Python script server.py and injected using
 * the Jinja2 templating engine.
 */
var error;

var queryMap = false;

var maxChartIndex = 1;

var beginDate = minYear.toString() + '-01-01', endDate = (maxYear+1).toString() + '2016-01-01';

var mapLoaded = false;

// Adds a marker to the map.
function queryWaterTimeSeries(location, map) {
  var template = $('#query-chart-template')[0].innerHTML;
  var chartElement = $($.parseXML(template)).contents();
  var chartElementId = 'query-chart-' + maxChartIndex;
  chartElement.attr('id', chartElementId);

  maxChartIndex++;

  var infoWindow = new google.maps.InfoWindow({content: chartElement[0]});

  // Add the marker at the clicked location, and add the next-available label
  // from the array of alphabetical characters.
  var marker = new google.maps.Marker({
    position: location,
    label: '',
    draggable: true,
    map: map
  });

  marker.addListener('dblclick', function () {
    marker.setMap(null);
  });

  marker.addListener('click', function () {
    infoWindow.open(map, marker);
  });

  infoWindow.open(map, marker);

  google.maps.event.addListener(infoWindow, 'domready', function () {
    $.ajax({
      url: '/get_ndwi_time_series',
      data: {location: JSON.stringify(marker.position), begin: beginDate, end: endDate},
      dataType: 'json',
      success: function (data) {
        // convert dates
        var data = data.map(function (d) {
          return {
            date: new Date(d.date).format('%Y-%m-%d'),
            value: d.value
          };
        });


        createQueryChart('#' + chartElementId, data);
      },
      error: function (data) {
        console.log(data.responseText);
      }
    });
  });

  queryMap = false;
  map.setOptions({draggableCursor: null});
}

var map = initializeMap();


if($('body').width() < 590) {
  $('#message-initializing-ee').css('left', '50%');
  $('#message-initializing-ee').css('width', '100vw');
  $('#message-initializing-ee').css('margin-left', '-50vw');
} else {
  $('#message-initializing-ee').css('left', '50%');
  $('#message-initializing-ee').css('width', '350px');
  $('#message-initializing-ee').css('margin-left', '-175px');
}

$('#message-initializing-ee').show();

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

var embedded = inIframe();

if(embedded) {
  console.log('embedded')
}

// client variables should be set by global template
ee.data.setAuthToken(client_id, token_type, access_token, token_expires_in_sec, true);

ee.initialize(null, null, function () {
  addLayers();

  $('#button-info').on('click', function (evt) {
    $('#help').fadeToggle();

    $.ajax({
      url: '/get_aoi_image_info_time_series',
      data: {aoi: shapesJson},
      dataType: 'json',
      success: function (data) {
        setChartData(data);
        $('#chart-dashboard').css('visibility', 'visible');
      },
      error: function (data) {
        console.log(data.responseText);
      }
    });
  });

  $('#download-button').on('click', function (evt) {
    var bounds = map.getBounds().toJSON();
    var query = $.param(bounds);
    window.open('/bbox/info?' + query);
  });

  $('#button-download').click(function () {
    $('#message-download').toggle();
  });

  $('#button-query').click(function () {
    map.setOptions({draggableCursor: 'crosshair'});
    queryMap = true;
  });

  $('#info-close-button').click(function () {
    $('#info-box').transition('slide right');
    $('#info-button').toggleClass('active');
  });

  $('#info-button').click(function () {
    $('#info-box').transition('slide right');
    $('#info-button').toggleClass('active');
  });

  $('#label-year-before').text(minYearStart);
  $('#label-year-after').text(maxYear);
  $('#slider-label-before').text(minYearStart);
  $('#twitter-button').show();
  $('#info-box').show();


  // This event listener calls queryWaterTimeSeries() when the map is clicked.
  google.maps.event.addListener(map, 'click', function (event) {
    if (!queryMap) {
      return;
    }

    queryWaterTimeSeries(event.latLng, map);
  });

  // TODO: enable mode selector after initialization
});

$('#button-menu-sidebar').click(function () {
  $('.ui.labeled.icon.sidebar')
    .sidebar('toggle')
  ;
});

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                 })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-74927830-1', 'auto');
ga('send', 'pageview');
