// we need a modulus operator that works for negative numbers
Number.prototype.mod = function (n) {
  return ((this % n) + n) % n;
};
Number.prototype.squared = function () {
  return (this * this);
};


function NamedImageMapType() {
  // Create an ImageMapType that adds the name as a class to each created div
  // The div contains the image

  // ImageMapType.apply(this, arguments) executes every line of code
  // in the ImageMapType body where the value of "this" is the new instance
  google.maps.ImageMapType.apply(this, arguments);
}
//Inherit
NamedImageMapType.prototype = Object.create(google.maps.ImageMapType.prototype);

// Overwrite getTile
NamedImageMapType.prototype.getTile = function (coord, zoom, ownerDocument) {
  // bind the original function to this context and execute
  // pass along all arguments
  var div = google.maps.ImageMapType.prototype.getTile.call(this, coord, zoom, ownerDocument);
  // inject the class name if available
  div.classList.add(this.name);
  return div;
};


// These are all the layers that we're rendering but we can't fill them in yet, because we have to define some functions first
var layers = [];

function getWaterTrendChangeRatio(start, stop) {
  // empiricaly found ratio
  return (15 / (stop - start));
}

var waterChangeTrendRatio = getWaterTrendChangeRatio(minYearSelection, maxYearSelection);

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}

function renderLandsatMosaic(percentile, start, end, sharpen) {
  var bands = ['swir1', 'nir', 'green'];

  var l8 = new ee.ImageCollection('LANDSAT/LC08/C01/T1_RT_TOA').filterDate(start, end).select(['B6', 'B5', 'B3'], bands);
  var l7 = new ee.ImageCollection('LANDSAT/LE07/C01/T1_RT_TOA').filterDate(start, end).select(['B5', 'B4', 'B2'], bands);

  var l5 = new ee.ImageCollection('LANDSAT/LT5_L1T_TOA').filterDate(start, end).select(['B5', 'B4', 'B2'], bands);
  var l4 = new ee.ImageCollection('LANDSAT/LT4_L1T_TOA').filterDate(start, end).select(['B5', 'B4', 'B2'], bands);

  var images = ee.ImageCollection(l8.merge(l7).merge(l5).merge(l4));

  if(minDoy !== 0 && maxDoy !== 365) {
    images = images.filter(ee.Filter.dayOfYear(minDoy, maxDoy))
  }

  var image = images
    .reduce(ee.Reducer.percentile([percentile]))
    .rename(bands);

  if (filterCount > 0) {
    image = image.mask(images.select(0).count().gt(filterCount));
  }


  if (sharpen) {
    image = image.subtract(image.convolve(ee.Kernel.gaussian(30, 20, 'meters')).convolve(ee.Kernel.laplacian8(0.4)));
  }

  return image.visualize({min: 0.05, max: [0.5, 0.5, 0.6], gamma: 1.4});
}

function renderSurfaceWaterChanges(enableHeatmap, change) {
  var scale = ee.Image('users/gena/AquaMonitor/water_changes_1985_240_2013_48');
  var land300m = ee.Image('users/gena/AquaMonitor/water_changes_1985_240_2013_48_land_300m');
  var water300m = ee.Image('users/gena/AquaMonitor/water_changes_1985_240_2013_48_water_300m');

  // SWBD mask
  var swbd = ee.Image('MODIS/MOD44W/MOD44W_005_2000_02_24').select('water_mask');
  var swbdMask = swbd.unmask().not()
    .focal_max(60000, 'circle', 'meters').reproject('EPSG:4326', null, 10000);

  if(maskWater) {
    land300m = land300m.mask(swbdMask);
    water300m = water300m.mask(swbdMask);
    scale = scale.multiply(swbdMask);
  }

  var bg = ee.Image(1).visualize({opacity: 0.9, palette: ['000000'], forceRgbOutput: true});

  var maxArea = 200;

  var landVis = land300m.mask(land300m.divide(maxArea))
    .visualize({min: 0, max: maxArea, palette: ['000000', '00ff00']});

  var waterVis = water300m.mask(water300m.divide(maxArea))
    .visualize({min: 0, max: maxArea, palette: ['000000', '00d8ff']});

  // heatmap
  var bufferSize = 20000;
  var blurSize = 30000;
  var blurSigma = 20000;
  var maxArea = 1500000;

  var fc = ee.FeatureCollection('ft:17TEfjvF14hKeDmSotkXrjYeplyT8O_SgRLuJFbYk');

  var heatmapWater = fc
    .reduceToImage(['total_wate'], ee.Reducer.sum())
    .focal_max(bufferSize, 'circle', 'meters')
    .focal_mode(bufferSize, 'circle', 'meters', 3)
    .convolve(ee.Kernel.gaussian(blurSize, blurSigma, 'meters'));

  var heatmapLand = fc
    .reduceToImage(['total_land'], ee.Reducer.sum())
    .focal_max(bufferSize, 'circle', 'meters')
    .focal_mode(bufferSize, 'circle', 'meters', 3)
    .convolve(ee.Kernel.gaussian(blurSize, blurSigma, 'meters'));

  var heatmapColors = ['000000', '00d8ff', 'aaffff'];
  var heatmapWaterVis = heatmapWater.mask(heatmapWater.divide(maxArea))
    .visualize({min: 0, max: maxArea, opacity: 0.3, palette: heatmapColors});

  var heatmapColors = ['000000', '00ff00', 'aaffaa'];
  var heatmapLandVis = heatmapLand.mask(heatmapLand.divide(maxArea))
    .visualize({min: 0, max: maxArea, opacity: 0.3, palette: heatmapColors});

  if (change) {
    var changeImage = scale.visualize({
      min: -0.02,
      max: 0.02,
      palette: ['00ff00', '000000', '00d8ff'],
      forceRgbOutput: true
    });
    var images = [
      bg
        .visualize({opacity: 0.7})
        .rename(['r', 'g', 'b']),
      changeImage
        .rename(['r', 'g', 'b'])
    ];
    return ee.ImageCollection.fromImages(images)
      .mosaic()
      .visualize({
        forceRgbOutput: true
      });
  }

  // composite
  if (enableHeatmap) {
    return ee.ImageCollection.fromImages([
      bg.visualize({opacity: 0.7})
        .rename(['r', 'g', 'b']),
      waterVis
        .rename(['r', 'g', 'b']),
      landVis
        .rename(['r', 'g', 'b']),
      heatmapLandVis
        .rename(['r', 'g', 'b']),
      heatmapWaterVis
        .rename(['r', 'g', 'b'])
    ])
      .mosaic()
      .visualize({
        forceRgbOutput: true
      });
  } else {
    return ee.ImageCollection.fromImages([
      bg
        .visualize({opacity: 0.7})
        .rename(['r', 'g', 'b']),
      waterVis
        .rename(['r', 'g', 'b']),
      landVis
        .rename(['r', 'g', 'b']),
    ])
      .mosaic()
      .visualize({
        forceRgbOutput: true
      });
  }
}


// A helper to apply an expression and linearly rescale the output.
var rescale = function (img, thresholds) {
  return img
    .subtract(
      thresholds[0]
    )
    .divide(
      ee.Number(thresholds[1])
        .subtract(thresholds[0])
    );
};

function getEdge(i) {
  var canny = ee.Algorithms.CannyEdgeDetector(i, 0.99, 0);
  canny = canny.mask(canny);
  return canny;
}

function renderWaterTrend(percentile, datesAndPeriods, slopeThreshold, slopeThresholdSensitive, slopeThresholdRatio, sensitive) {
  // Add a band containing image date as years since 1991.
  function createTimeBand(img) {
    var date = ee.Date(img.get('system:time_start'));
    var year = date.get('year').subtract(1970);
    // add rescaled MNDWI image
    return ee.Image(year).byte()
      .addBands(rescale(img, [-0.6, 0.6]));
  }

  if (ndviFilter > -1) {
    var bands = ['green', 'swir1', 'red', 'nir'];
    var bands8 = ['B3', 'B6', 'B5', 'B2'];
    var bands7 = ['B2', 'B5', 'B4', 'B1'];
  } else {
    var bands = ['green', 'swir1'];
    var bands8 = ['B3', 'B6'];
    var bands7 = ['B2', 'B5'];
  }

  var images = new ee.ImageCollection([]);

  var images_l8 = new ee.ImageCollection('LANDSAT/LC8_L1T_TOA').select(bands8, bands);
  images = new ee.ImageCollection(images.merge(images_l8));

  var images_l7 = new ee.ImageCollection('LANDSAT/LE7_L1T_TOA').select(bands7, bands);
  images = new ee.ImageCollection(images.merge(images_l7));

  var images_l5 = new ee.ImageCollection('LANDSAT/LT5_L1T_TOA').select(bands7, bands);
  images = new ee.ImageCollection(images.merge(images_l5));

  var images_l4 = new ee.ImageCollection('LANDSAT/LT4_L1T_TOA').select(bands7, bands);
  images = new ee.ImageCollection(images.merge(images_l4));

  var list = ee.List(datesAndPeriods);

  var annualPercentile = ee.ImageCollection(list.map(function (i) {
    var l = ee.List(i);
    var year = l.get(0);
    var months = l.get(1);
    var start = ee.Date(year);
    var stop = ee.Date(year).advance(months, 'month');

    var filtered = images
      .filterDate(start, stop);

    if (smoothen) {
      filtered = filtered.map(function (i) {
        return i.resample('bicubic');
      });
    }

    var image = filtered
      .reduce(
        ee.Reducer
          .percentile([percentile])
      )
      .rename(
        bands
      );

    var result = image
      .normalizedDifference(['green', 'swir1']).rename('water')
      .set('system:time_start', start);

    if (ndviFilter > -1) {
      var ndvi = image.normalizedDifference(['nir', 'red']).rename('ndvi');
      result = result.addBands(ndvi);
    }

    if (filterCount > 0) {
      result = result.addBands(filtered.select(0).count().rename('count'));
    }

    /*
     1) Map a function to update the mask of each image to be the min mask of all bands that you use
     (but don't include bands you don't otherwise use)

     2) clip to a negative buffer of 6km.

     3) Make sure you're not including nighttime images; limit SUN_ELEVATION to > 0 and maybe > ~30.
     */

    return result;
  }));

  var mndwi = annualPercentile.select('water');

  if (ndviFilter > -1) {
    var ndvi = annualPercentile.select('ndvi');
  }

  var fit = mndwi
    .map(createTimeBand)
    .reduce(ee.Reducer.linearFit().unweighted());

  var scale = fit.select('scale');

  var mndwiMin = mndwi.min();
  var mndwiMax = mndwi.max();

  var mask = scale.abs().gt(slopeThresholdRatio * slopeThreshold)
    .and(mndwiMax.gt(-0.05)) // at least one value looks like water
    .and(mndwiMin.lt(0.1)); // at least one value looks like ground

  if (filterCount > 0) {
    mask = mask
      .and(
        annualPercentile
          .select('count')
          .min()
          .gt(filterCount)
      );
  }


  if (ndviFilter > -1) {
    mask = mask.and(
      ndvi
        .max()
        .gt(ndviFilter)
    ); // darkest is not vegetation
  }

  if (sensitive && refine) {
    var maskSensitive = null;

    mask = mask.reproject('EPSG:4326', null, 30);
    var maskProjection = mask.projection();

    // more sensitive mask around change
    maskSensitive = mask
      .reduceResolution(ee.Reducer.max(), true)
      .focal_max(6)
      .reproject(maskProjection.scale(6, 6))
      .focal_median(150, 'circle', 'meters');

    //mask = scale.abs().gt(0.008).mask(maskSensitive.reproject(maskProjection))
    mask = scale
      .abs()
      .gt(slopeThresholdRatio * slopeThresholdSensitive)
      .mask(maskSensitive.reproject(maskProjection))
      .and(mndwiMax.gt(-0.05)) // at least one value looks like water
      .and(mndwiMin.lt(0.1)); // at least one value looks like ground

    if (ndviFilter > -1) {
      mask = mask
        .and(
          ndvi
            .max()
            .gt(ndviFilter)
        ); // darkest is not vegetation
    }

    // smoothen scale and mask
    if (smoothen === true || smoothen === 1) {
      scale = scale
        .focal_median(25, 'circle', 'meters', 3);

      mask = mask
        .focal_mode(35, 'circle', 'meters', 3);
    }
  }

  var bg = scale.visualize({
    min: -slopeThreshold * slopeThresholdRatio,
    max: slopeThreshold * slopeThresholdRatio,
    palette: ['00ff00', '000000', '00d8ff'], opacity: waterSlopeOpacity
  });

  if (!sensitive) {
    var swbd = ee.Image('MODIS/MOD44W/MOD44W_005_2000_02_24').select('water_mask');
    var swbdMask = swbd.unmask().not().focal_median(1).focal_max(5); // .add(0.2);
  } else {
    bg = bg.mask(
      ee.Image(waterSlopeOpacity)
        .toFloat()
        .multiply(
          mndwiMin
            .gt(0.4)
            .focal_mode(1)
            .not()
        ) // exclude when both are water
    );
  }

  if (filterCount > 0) {
    bg = bg
      .multiply(
        annualPercentile
          .select('count')
          .min()
          .gt(filterCount)
      );
  }

  scale = scale.mask(mask);

  if (sensitive && refine) {
    var edgeWater = getEdge(mask.mask(scale.gt(0))).visualize({palette: '00d8ff'});
    var edgeLand = getEdge(mask.mask(scale.lt(0))).visualize({palette: '00ff00'});

    var change = scale.visualize({
      min: -slopeThreshold * slopeThresholdRatio,
      max: slopeThreshold * slopeThresholdRatio,
      palette: ['00ff00', '000000', '00d8ff'],
      opacity: 0.3
    });

    if (debug) {
      var maskSensitiveVis = maskSensitive.mask(maskSensitive).visualize({palette: ['ffffff', '000000'], opacity: 0.5});
      return ee.ImageCollection.fromImages([bg, maskSensitiveVis, change, edgeWater, edgeLand]).mosaic();
    } else {
      return ee.ImageCollection.fromImages([bg, change, edgeWater, edgeLand]).mosaic();
    }

  } else {
    var changeImage = scale.visualize({
      min: -slopeThreshold * slopeThresholdRatio,
      max: slopeThreshold * slopeThresholdRatio,
      palette: ['00ff00', '000000', '00d8ff']
    });

    return ee.ImageCollection.fromImages([bg, changeImage]).mosaic();
  }
}

function setLayer(map, layer) {
  // add the layer to the map
  if (typeof(layer.urls) === 'object') {
    // some object that generates urls
    addEELayer(layer);
  } else {
    // layers.urls should be strings
    addStaticLayer(layer);
  }
}
function addStaticLayer(layer) {
  // use _.assign from options
  // The Google Maps API calls getTileUrl() when it tries to display a map
  // tile.  This is a good place to swap in the MapID and token we got from
  // the Python script. The other values describe other properties of the
  // custom map type.
  var staticOptions = {
    getTileUrl: function (tile, zoom) {
      if (!_.inRange(zoom, layer.minZoom, layer.maxZoom)) {
        return '';
      }

      // global mode
      if (layer.mode !== mode) {
        return '';
      }

      // You don't want to know..... Maps bug...
      if (map.overlayMapTypes.getAt(layer.index).opacity < 0.01) {
        return '';
      }

      // TODO: replace tile.x by mod
      return layer.urls
        .replace('{x}', tile.x.mod(Math.pow(2, zoom)))
        .replace('{y}', tile.y)
        .replace('{z}', zoom);
    },
    // this name is available as <div class="name"><img></div> in the tile
    name: layer.name,
    alt: layer.name,
    tileSize: new google.maps.Size(256, 256)
  };

  var mapType = new NamedImageMapType(staticOptions);

  // Add the EE layer to the map.
  // Note that the layer.index does not define the position, but the z-index...
  map.overlayMapTypes.setAt(layer.index, mapType);
  refreshLayerOpacity(map, layer);
}

function addEELayer(layer) {
  // urls is a google earth engine function
  layer.urls.getMap({}, function (mapId, error) {
    if (error) {
      console.log(error);
    }

    var id = mapId.mapid;
    var token = mapId.token;

    // The Google Maps API calls getTileUrl() when it tries to display a map
    // tile.  This is a good place to swap in the MapID and token we got from
    // the Python script. The other values describe other properties of the
    // custom map type.
    var eeMapOptions = {
      getTileUrl: function (tile, zoom) {

        if (!_.inRange(zoom, layer.minZoom, layer.maxZoom)) {
          return '';
        }

        // global mode
        if (layer.mode !== mode) {
          return '';
        }

        // You don't want to know..... Maps bug...
        if (map.overlayMapTypes.getAt(layer.index).opacity < 0.01) {
          return '';
        }

        var baseUrl = 'https://earthengine.googleapis.com/map';
        var url = [baseUrl, id, zoom, tile.x, tile.y].join('/');
        url += '?token=' + token;

        return url;
      },
      name: layer.name,
      alt: layer.name,
      tileSize: new google.maps.Size(256, 256)
    };

    var mapType = new NamedImageMapType(eeMapOptions);

    // Add the EE layer to the map.
    map.overlayMapTypes.setAt(layer.index, mapType);
    refreshLayerOpacity(map, layer);
  });
}


var map;

var shapesJson;

// Refresh different components from other components.
function refreshGeoJsonFromData(feature) {
  //feature.setDraggable(true);
  map.data.toGeoJson(function (geoJson) {
    shapesJson = JSON.stringify(geoJson, null, 2);
  });
}

// Apply listeners to refresh the GeoJson display on a given data layer.
function bindDataLayerListeners(dataLayer) {
  dataLayer.addListener('addfeature', refreshGeoJsonFromData);
  dataLayer.addListener('removefeature', refreshGeoJsonFromData);
  dataLayer.addListener('setgeometry', refreshGeoJsonFromData);
}

function updateMapZoomDependencies() {
  var minZoomLevel = 7;

  var currentZoom = map.getZoom();

  var zoomDiv = $('#zoom-warning');

  // check if zoom level is sufficient to perform analysis
  if (currentZoom < minZoomLevel) {
    zoomDiv.text('Warning! Zoom in to level ' + minZoomLevel + ' to see surface water changes for selected dates. Current zoom level: ' + currentZoom);
  }

  if (mode === 'dynamic') {
    if (currentZoom >= minZoomLevel) {
      $('#time-selector-container').fadeIn();
      $('#layers-table').fadeIn();
      $('#label-year-before').fadeIn();
      $('#label-year-after').fadeIn();
      zoomDiv.fadeOut();
    } else {
      $('#time-selector-container').fadeOut();
      $('#layers-table').fadeOut();
      $('#label-year-before').fadeOut();
      $('#label-year-after').fadeOut();
      zoomDiv.fadeIn();
    }
  } else {
    $('#time-selector-container').fadeOut();
    $('#layers-table').fadeOut();
    $('#label-year-before').fadeOut();
    $('#label-year-after').fadeOut();
    zoomDiv.fadeOut();
  }
}

var locationInfos = [
  {center: {lat: 25, lng: 55}, zoom: 11}, // 0 Dubai, constructions
  {center: {lat: 17.555599910902977, lng: 96.10637664794922}, zoom: 10}, // 1 Myanmar, reservoirs
  {center: {lat: 36.24200388695886, lng: -114.65053558349608}, zoom: 10}, // 2 LasVegas, Colorado River
  {center: {lat: -6.115019440922777, lng: -74.90577697753905}, zoom: 11}, // 3 Peru, crazy rivers
  {center: {lat: -18.64207976751951, lng: 36.32624626159668}, zoom: 11}, // 4 Zambezi River Delta
  {center: {lat: 24.30417608337614, lng: 89.7373104095459}, zoom: 8}, // 5 Brahmaputra River
  {center: {lat: 26.246405548914684, lng: 50.58195114135742}, zoom: 12}, // 6 Bahrain
  {center: {lat: 21.142727475393187, lng: 31.03641510009766}, zoom: 7}, // 7 Nile
  {center: {lat: 52.045428812114544, lng: 4.190292358398442}, zoom: 11}, // 8 Netherlands
  {center: {lat: 51.52194707785323, lng: 14.137382507324222}, zoom: 11}, // 9 Mines? Germany
  {center: {lat: -12.832119855443182, lng: -70.24379730224612}, zoom: 11}, // 10 Mines, Peru
  {center: {lat: -18.725176095360386, lng: -51.2161636352539}, zoom: 12}, // 11 Brazil, reservoirs
  {center: {lat: 30.838073102713093, lng: 110.76282501220703}, zoom: 10}, // 12 Three Georges Dam, China
  {center: {lat: 5.351403568565903, lng: -53.20623397827148}, zoom: 10}, // 13 French Guiana, mud bank erosion / accretion
  {center: {lat: 26.19027242797399, lng: 57.978882789611816}, zoom: 12}, // 14 Iran, reservoir
  {center: {lat: 29.711330304705562, lng: 111.12202644348145}, zoom: 13}, // 15 Xieshui, China, dam
  {center: {lat: 45.87827701665845, lng: 126.98593020439148}, zoom: 11}, // 16 reservoir somewhere in China
  {center: {lat: 18.906385392620926, lng: 32.243194580078125}, zoom: 11}, // 17 Merowe reservoir, Sudan
  {center: {lat: 34.91825639532396, lng: 112.40150451660156}, zoom: 12}, // 18 Xiaolangdi Reservoir, Red River, China
  {center: {lat: 37.53203099283159, lng: 93.6544406414032}, zoom: 11}, // 19 Taiji Reservoirs China
  {center: {lat: 37.44646619568239, lng: 65.75304399726554}, zoom: 10}, // 20 Amurdarya
  {center: {lat: 27.633179467080392, lng: 49.069528579711914}, zoom: 12}, // 21 Saudi Arabia
  // http://aqua-monitor.appspot.com?view=51.30393503657091,-69.508957862854.9z - strange :)
];


function initializeMap() {

  var locationIndex = Math.round(Math.random() * (locationInfos.length - 1));

  if (site != -1) {
    locationIndex = site;
  }

  site = locationIndex;

  var location = locationInfos[locationIndex];

  // full map
  location.zoom = 3;
  location.center.lat = 16.240652044117923;
  location.center.lng = -10;
  
    // overwrite from the filled in template if available
    location.zoom = _.get(view, 'zoom', location.zoom);
    location.center.lat = _.get(view, 'lat', location.center.lat);
    location.center.lng = _.get(view, 'lng', location.center.lng);

  var mapOptions = {
    center: location.center,
    zoom: location.zoom,
    minZoom: 1,
    maxZoom: 17,
    draggable: true,
    editable: true,
    mapTypeControl: true,
    mapTypeControlOptions: {position: google.maps.ControlPosition.TOP_RIGHT},
    streetViewControl: true,
    scaleControl: true,
    scaleControlOptions: {position: google.maps.ControlPosition.BOTTOM_RIGHT}
  };

  // Create the base Google Map.
  map = new google.maps.Map(document.getElementById('map'), mapOptions);
  map.setMapTypeId(google.maps.MapTypeId.SATELLITE);

  map.addListener('zoom_changed', function () {
    console.log('Map zoom: ' + map.getZoom());
    updateMapZoomDependencies();
  });

  // button change style
  var styleControlDiv = document.createElement('div');
  $(styleControlDiv).addClass('gm-aqua-control');
  styleControlDiv.innerHTML = '<button title="Switch between dark / light styles" class="ui toggle basic compact small icon button"><i class="paint brush icon"></button>';
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(styleControlDiv);
  $(styleControlDiv).children('button').on('click', function (evt, el) {
    $('#map').toggleClass('styled');
    $(evt.currentTarget).toggleClass('active');
  });

  // switch mode between dynamic / static
  var modeControlDiv = document.createElement('div');
  $(modeControlDiv).addClass('gm-aqua-control');
  modeControlDiv.innerHTML = '<button title="Toggle between static/dynamic versions" class="ui toggle basic compact small icon button"><i class="options icon"></button>';

  if(mode === 'dynamic') {
      $(modeControlDiv).children('button').addClass('active')
  }

  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(modeControlDiv);

  $(modeControlDiv).children('button').on('click', function (evt, el) {
    toggleMode();
    $(evt.currentTarget).toggleClass('active');
  });

  // info button
  if($('body').width() >= 1024) {
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push($('#info-button')[0]);
  }
  
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push($('#share-button')[0]);

  // strange, style changes for one button (GMaps bugs?)
  $('#share-button').css('padding', 0)

  $('#share-button').on('click', function (evt, el) {
    var count = 0
    var url = ''

    function delimiter() {
        return count ? '&' : '?'
    }

    if(mode != 'static') {
      url += delimiter() + 'mode=dynamic';
      count++;
    }

    url += delimiter() + 'from=' + minYearSelection
    count++;

    url += delimiter() + 'to=' + maxYearSelection
    count++;

    url += delimiter() + 'view=' + map.getCenter().lat() + ',' + map.getCenter().lng() + ',' + map.getZoom() + 'z'
    count++;

    if(minDoy !== 0) {
      url += delimiter() + 'min_doy=' + minDoy;
      count++;
    }

    if(minDoy !== 365) {
      url += delimiter() + 'max_doy=' + maxDoy;
      count++;
    }

    if(percentile != 20) { // default
      url += delimiter() + 'percentile=' + percentile
      count++;
    }

    window.history.replaceState('', '', url);
  });

  google.maps.event.addDomListener(document, 'keyup', function (e) {
    var code = (e.keyCode ? e.keyCode : e.which);

    if (code === 46) { // Delete
      map.data.forEach(function (feature) {
        //filter...
        map.data.remove(feature);

        $('#chart-dashboard').css('visibility', 'hidden');
      });
    }
  });

  // call when map is ready.
  initAutocomplete(map);

  return map;
}

function addLayers() {

  function afterLayersAdded() {


    var sliderDefaults = {
      min: 0,
      max: 100,
      orientation: 'horizontal',
      tooltip_position: 'left',
      touchCapable: true
    };
    var sliders = [
      {
        sliderSelector: '#slider-change',
        toggleSelector: '#toggle-change',
        properties: {
          value: layerByName('dynamic-change').opacity
        },
        layers: [
          'dynamic-change',
          'dynamic-change-refined'
        ],
        afterSlide: function (evt) {
          // nothing to do
        }
      },
      {
        sliderSelector: '#slider-after',
        toggleSelector: '#toggle-after',
        properties: {
          value: layerByName('after-percentile').opacity
        },
        layers: [
          'after-percentile',
          'after-percentile-sharpened'
        ],
        afterSlide: function (evt) {
          $('#label-year-after').css({opacity: evt.value / 100.0});
          var before = $('#slider-before').slider('getValue');
          $('#label-year-before').css({opacity: (before - evt.value) / 100.0});
        }
      },
      {
        sliderSelector: '#slider-before',
        toggleSelector: '#toggle-before',
        properties: {
          value: layerByName('before-percentile').opacity
        },
        layers: [
          'before-percentile',
          'before-percentile-sharpened'
        ],
        afterSlide: function (evt) {
          var after = $('#slider-after').slider('getValue');
          $('#label-year-before').css({opacity: (evt.value - after) / 100.0});
        }
      }
    ];

    // update sliders
    _.each(sliders, function(slider) {
      function updateSlider(evt) {
        _.each(slider.layers, function(layerName) {
          var layer = layerByName(layerName);
          layer.opacity = evt.value;
          refreshLayerOpacity(map, layer);
          slider.afterSlide(evt);
        });
      }

      // apply defaults and update sliders
      $(slider.sliderSelector)
        .slider(_.defaults(slider.properties, sliderDefaults))
        .on('slide', updateSlider)
        .on('slideStop', updateSlider);
    });


    // update toggles
    _.each(sliders, function(slider) {
      $(slider.toggleSelector).checkbox();
      $(slider.toggleSelector).change(function () {
        var checked = $('#toggle-change').is(':checked');
        _.each(slider.layers, function(layerName) {
          var layer = layerByName(layerName);
          if (checked) {
            layer.opacity = 100;
          } else {
            layer.opacity = 0;
          }
          refreshLayerOpacity(map, layer);
        });
      });

    });

    $('.tooltip-main').removeClass('top').addClass('right');
    // this one is reused....
    function fixTooltips() {
      $('.tooltip-main').css('margin-left', '10px');
    }

    fixTooltips();

    // hide for now
    $('.tooltip-main').css('display', 'none');

    $('#message-initializing-ee').fadeOut();

    function layout() {
      if ($('body').width() < 845) {
        $('#time-selector-container').css('width', '70%');
        $('#time-selector-container').css('margin-left', '-35%');

        $('#deltares-logo').css('bottom', '20px')

        $('#layers-table').css('right', '10vw');
        $('#layers-table').css('left', '10px');
        $('#layers-table').css('right', '20px');
        $('#layers-table').css('bottom', '130px');
        $('.slider').css('width', '60vw');
      } else {
        $('#time-selector-container').css('width', '40%');
        $('#time-selector-container').css('margin-left', '-20%');

        $('#deltares-logo').css('bottom', '7px');

        $('#layers-table').css('bottom', '25px');
        $('#layers-table').css('right', '70px');
      }

      if ($('body').height() < 800) {
         if($('#info-box').is(':visible')) {
           $('#twitter-timeline-box').hide();
         }       
      } else {
         if($('#info-box').is(':visible')) {
           $('#twitter-timeline-box').show();
         }
      }
    }

    layout();

    $(window).on('resize', function () {
      // some layout hacks....
      layout();

      if (+$('#slider-div-before').width() < 60) {
        $('.tooltip-main').css('display', 'none');
      }

      fixTooltips();

    });
  }

  function fmt(date) {
    return date.format('YYYY-MM-DD');
  }

  var before1 = moment(['{0}-01-01'.format(minYearSelection)]);
  var before2 = moment(['{0}-01-01'.format(minYearSelection)]).add(averagingMonths1, 'month');

  var after1 = moment(['{0}-01-01'.format(maxYearSelection)]);
  var after2 = moment(['{0}-01-01'.format(maxYearSelection)]).add(averagingMonths2, 'month');


  // add dynamic changes layers
  var yearsAndPeriods = ee.List([[fmt(before1), averagingMonths1], [fmt(after1), averagingMonths2]]);

  if (allYears) {
    var years = ee.List.sequence(minYearSelection, maxYearSelection, allYearsStep).map(function (y) {
      return ee.String(y).slice(0, 4).cat('-01-01');
    });
    var months = ee.List.repeat(averagingMonths1, maxYear - minYear + 1);
    yearsAndPeriods = years.zip(months);
  }

  // layer counter
  var nLayers = 1;
  layers = [
    // static layers
    {
      name: 'change-heatmap',
      urls: 'https://storage.googleapis.com/aqua-monitor/AquaMonitor_1_with_heatmap_2016_08_27/{z}/{x}/{y}.png',
      index: nLayers++,
      minZoom: 0,
      maxZoom: 5,
      mode: 'static',
      opacity: 80
    },
    {
      name: 'change-upscaled-300m',
      urls: 'https://storage.googleapis.com/aqua-monitor/AquaMonitor_2_300m_2016_08_27/{z}/{x}/{y}.png',
      index: nLayers++,
      minZoom: 5,
      maxZoom: 10,
      mode: 'static',
      opacity: 80
    },
    {
      name: 'change',
      urls: renderSurfaceWaterChanges(false, true),
      index: nLayers++,
      minZoom: 10,
      maxZoom: 22,
      mode: 'static',
      opacity: 80
    },
    // dynamic mode layers
    {
      name: 'before-percentile',
      urls: renderLandsatMosaic(percentile, fmt(before1), fmt(before2)),
      index: nLayers++,
      minZoom: 7,
      maxZoom: 12,
      mode: 'dynamic',
      opacity: 100
    },
    {
      name: 'after-percentile',
      urls: renderLandsatMosaic(percentile, fmt(after1), fmt(after2)),
      index: nLayers++,
      minZoom: 7,
      maxZoom: 12,
      mode: 'dynamic',
      opacity: 0
    },
    {
      name: 'dynamic-change',
      urls: renderWaterTrend(percentile, yearsAndPeriods, waterSlopeThreshold, waterSlopeThresholdSensitive, waterChangeTrendRatio),
      index: nLayers++,
      minZoom: 7,
      maxZoom: 12,
      mode: 'dynamic',
      opacity: 100
    },
    {
      name: 'before-percentile-sharpened',
      urls: renderLandsatMosaic(percentile, fmt(before1), fmt(before2), true),
      index: nLayers++,
      minZoom: 12,
      maxZoom: 22,
      mode: 'dynamic',
      opacity: 100
    },
    {
      name: 'after-percentile-sharpened',
      urls: renderLandsatMosaic(percentile, fmt(after1), fmt(after2), true),
      index: nLayers++,
      minZoom: 12,
      maxZoom: 22,
      mode: 'dynamic',
      opacity: 0
    },
    {
      name: 'dynamic-change-refined',
      urls: renderWaterTrend(percentile, yearsAndPeriods, waterSlopeThreshold, waterSlopeThresholdSensitive, waterChangeTrendRatio, true),
      index: nLayers++,
      minZoom: 12,
      maxZoom: 22,
      mode: 'dynamic',
      opacity: 100
    }
  ];
  // add all layers
  _.each(layers, function (layer) {
    setLayer(map, layer);
  });
  afterLayersAdded();


  // HACK: reposition control, Google Maps options are very limited
  var positionInitialized = false; // used in a HACK to
  google.maps.event.addDomListener(map, 'tilesloaded', function () {
    // We only want to wrap once!
    if (!positionInitialized) {
      positionInitialized = true;

      updateMapZoomDependencies();
    }
  });
}

function layerByName(name) {
  return _.find(layers, ['name', name]);
}

function toggleMode() {
  // change the global mode
  mode = (mode == 'dynamic') ? 'static' : 'dynamic';
  console.log('mode change to', mode);

  if (mode === 'dynamic') {
    $('#info-text-title').text('Surface water changes (1985-2017)');
    $('#info-text-body').html('Green and blue colors represent areas where surface water changes occured during the last 30 years. Green pixels show where surface water has been turned into land (accretion, land reclamation, droughts). Blue pixels show where land has been changed into surface water (erosion, reservoir construction). <br><br><strong>Note, it may take some time for results to appear, because the analysis is performed on-the-fly.</strong><br><br>The results of the analysis are published in: <br><br><a href="http://www.nature.com/nclimate/journal/v6/n9/full/nclimate3111.html"><strong>Donchyts et.al, 2016, Nature Climate Change</strong></a><br><br><br><a href="http://earthengine.google.com"><img src="static/images/GEE.png"></a>');

    $('#map').addClass('dynamic');
    $('#map').removeClass('static');

    var after = $('#slider-after').slider('getValue');
    $('#label-year-after').css({opacity: after / 100.0});
    var before = $('#slider-before').slider('getValue');
    $('#label-year-before').css({opacity: (before - after) / 100.0});
  } else {
    $('#info-text-title').text('Surface water changes (1985-2017)');
    $('#info-text-body').html('Green and blue colors represent areas where surface water changes occured during the last 30 years. Green pixels show where surface water has been turned into land (accretion, land reclamation, droughts). Blue pixels show where land has been changed into surface water (erosion, reservoir construction).<br><br>The results of the analysis are published in: <br><br><a href="http://www.nature.com/nclimate/journal/v6/n9/full/nclimate3111.html"><strong>Donchyts et.al, 2016, Nature Climate Change</strong></a><br><br><br><a href="http://earthengine.google.com"><img src="static/images/GEE.png"></a>');

    $('#map').addClass('static');
    $('#map').removeClass('dynamic');

    $('#label-year-after').css({opacity: 0});
    $('#label-year-before').css({opacity: 0});
  }

  updateMapZoomDependencies();

  _.each(layers, function (layer) {
    //refreshLayerOpacity(map, layer)

    // reset all overlays so that url's are reevaluated (based on zoom)
    var overlay = map.overlayMapTypes.getAt(layer.index);
    map.overlayMapTypes.removeAt(layer.index);
    map.overlayMapTypes.insertAt(layer.index, overlay);
  });
}

function refreshLayerOpacity(map, layer) {
  var overlay = map.overlayMapTypes.getAt(layer.index);
  if (overlay === undefined) {
    console.log('trying to set opacity for undefined overlay', layer, overlay);
    return;
  }

  if(layer.mode === 'static') {
    if(mode === 'static') {
      overlay.setOpacity(layer.opacity / 100.0);
    } else {
      overlay.setOpacity(0);
    }
  }

  var appear = layer.opacity / 100 > 0.01 && overlay.getOpacity() < 0.01;
  overlay.setOpacity(layer.opacity / 100.0);

  // appear hack (is visible, was hidden)
  if (appear) {
    map.overlayMapTypes.removeAt(layer.index);
    map.overlayMapTypes.insertAt(layer.index, overlay);
  }

}
