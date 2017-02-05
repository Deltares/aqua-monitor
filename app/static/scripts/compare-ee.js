// globals: token, comparison
(function () {
  'use strict';
  function addLayer(map, layer) {
    layer.getMap({}, function(mapId) {
      var id = mapId.mapid;
      var token = mapId.token;

      // The Google Maps API calls getTileUrl() when it tries to display a map
      // tile.  This is a good place to swap in the MapID and token we got from
      // the Python script. The other values describe other properties of the
      // custom map type.
      var eeMapOptions = {
        getTileUrl: function (tile, zoom) {
          var baseUrl = 'https://earthengine.googleapis.com/map';
          var url = [baseUrl, id, zoom, tile.x, tile.y].join('/');
          url += '?token=' + token;
          return url;
        },
        tileSize: new google.maps.Size(256, 256)
      };

      // Create the map type.
      var mapType = new google.maps.ImageMapType(eeMapOptions);
      map.overlayMapTypes.push(mapType);

    });

  }
  function renderLandsatMosaic(percentile, start, end) {
    var bands = ['swir1', 'nir', 'green'];
    var l8 = new ee.ImageCollection('LANDSAT/LC8_L1T_TOA').filterDate(start, end).select(['B6', 'B5', 'B3'], bands);
    var l7 = new ee.ImageCollection('LANDSAT/LE7_L1T_TOA').filterDate(start, end).select(['B5', 'B4', 'B2'], bands);
    var l5 = new ee.ImageCollection('LANDSAT/LT5_L1T_TOA').filterDate(start, end).select(['B5', 'B4', 'B2'], bands);

    var images = ee.ImageCollection(l8.merge(l7).merge(l5))
          .reduce(ee.Reducer.percentile([percentile]))
          .rename(bands);

    return images.visualize({min: 0.05, max: [0.5, 0.5, 0.6], gamma: 1.4});
  }

  $(document).ready(function(){
    // client variables should be set by global template
    ee.data.setAuthToken(client_id, token_type, access_token, token_expires_in_sec, true);

    ee.initialize(null, null, function () {
      addLayer(comparison.bottomMap, renderLandsatMosaic(20, '2000-01-01', '2001-01-01'));
      addLayer(comparison.topMap, renderLandsatMosaic(20, '2016-01-01', '2017-01-01'));

    });

  });

}());
