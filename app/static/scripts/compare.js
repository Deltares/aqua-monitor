// globals: google, view

// exported variables
// global comparison object
var comparison = {};

var exports = (function () {
  'use strict';

  function initializeComparison() {

    // empty styles
    var styles = [{
      stylers:[{ color: '#444444' }]
    }];
    var blankMap = new google.maps.StyledMapType(styles);

    // from the global view
    var zoom = _.get(view, 'zoom', 12);
    var lat = _.get(view, 'lat', 52.05);
    var lng = _.get(view, 'lng', 4.19);

    // We want to be able to run multiple comparisons for now we only support the first
    var container = document.getElementsByClassName('compare-container')[0];
    comparison.container = container;
    // initialize with different options
    var topOptions = {
      zoom: zoom,
      center: new google.maps.LatLng(
        lat,
        lng
      ),
      mapTypeId: google.maps.MapTypeId.SATELLITE
    };
    var bottomOptions = {
      zoom: zoom,
      center: new google.maps.LatLng(
        lat,
        lng
      ),
      mapTypeId: google.maps.MapTypeId.SATELLITE
    };
    var bottomMap = new google.maps.Map(container.getElementsByClassName('bottom-map')[0], bottomOptions);
    bottomMap.mapTypes.set('blank', blankMap);
    var topMap = new google.maps.Map(container.getElementsByClassName('top-map')[0], topOptions);
    topMap.mapTypes.set('blank', blankMap);

    // We might run into some ping-pong here.
    // for now it seems to work..
    google.maps.event.addListener(bottomMap, 'bounds_changed', (function () {
      topMap.setCenter(bottomMap.getCenter());
      topMap.setZoom(bottomMap.getZoom());
    }));

    google.maps.event.addListener(topMap, 'bounds_changed', (function () {
      bottomMap.setCenter(topMap.getCenter());
      bottomMap.setZoom(topMap.getZoom());
    }));

    // store in exported object
    comparison.topMap = topMap;
    comparison.bottomMap = bottomMap;


  };

  // is this general load or google maps load?
  google.maps.event.addDomListener(window, 'load', initializeComparison);


  // set slider logic
  $('.comparison-slider').on('input', function(evt){

    // compute new width
    var width = evt.target.value + 'vw';

    $(evt.target).siblings('.top-map-mask').css('width', width);
  });

  // initialize first slider
  // TODO: make sure this works on multipage document
  var slider = $('.comparison-slider');
  var width = slider[0].value + 'vw';
  slider.siblings('.top-map-mask').css('width', width);



  return comparison;
}());

// If we're in node for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
}
