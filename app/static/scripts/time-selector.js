$(function () {

  var prevFrom = null;
  var prevTo = null;

  $('#time-selector-range').ionRangeSlider({
    type: 'double',
    keyboard: true,
    min: minYear,
    max: maxYear,
    from: minYearStart,
    to: maxYear,
    min_interval: 1,
    grid: true,
    grid_snap: true,
    prettify: function (num) {
      var m = moment(num, 'YYYY').locale('en');
      return m.format('YYYY');
    },
    onFinish: function (data) {
      function fmt(date) { return date.format('YYYY-MM-DD');}

      var years = _.map(
        [
          moment([data.from]),
          moment([data.from]).add(averagingMonths1, 'month'),
          moment([data.to]).add(-averagingMonths2, 'month'),
          moment([data.to])
        ],
        fmt
      );
      // reused variable;
      var layer;

      if(data.to != prevTo || data.from != prevFrom) {
        var yearsAndPeriods = [[years[0], averagingMonths1], [years[3], averagingMonths2]];
        var waterChangeTrendRatio = getWaterTrendChangeRatio(data.from, data.to);
        layer = layerByName('dynamic-change');
        layer.urls = renderWaterTrend(percentile, yearsAndPeriods, waterSlopeThreshold, waterSlopeThresholdSensitive, waterChangeTrendRatio);
        setLayer(map, layer);
        layer = layerByName('dynamic-change-refined');
        layer.urls = renderWaterTrend(percentile, yearsAndPeriods, waterSlopeThreshold, waterSlopeThresholdSensitive, waterChangeTrendRatio, true);
        setLayer(map, layer);
      }

      if(data.from != prevFrom) {
        layer = layerByName('before-percentile');
        layer.urls = renderLandsatMosaic(percentile, years[0], fmt(moment([data.from]).add(averagingMonths1, 'month')));
        setLayer(map, layer);
        layer = layerByName('before-percentile-sharpened');
        layer.urls = renderLandsatMosaic(percentile, years[0], fmt(moment([data.from]).add(averagingMonths1, 'month')));
        setLayer(map, layer);
        prevFrom = data.from;
      }

      if(data.to != prevTo) {
        layer = layerByName('before-percentile');
        layer.urls = renderLandsatMosaic(percentile, years[3], fmt(moment([data.to]).add(averagingMonths2, 'month')));
        setLayer(map, layer);
        layer = layerByName('before-percentile-sharpened');
        layer.urls = renderLandsatMosaic(percentile, years[3], fmt(moment([data.to]).add(averagingMonths2, 'month')), true);
        setLayer(map, layer);
        prevTo = data.to;
      }

      minYear = data.from;
      maxYear = data.to;
    },
    onChange: function (data) {
      $('#slider-label-before').text(data.from);
      $('#slider-label-after').text(data.to);
      $('#label-year-before').text(data.from);
      $('#label-year-after').text(data.to);
    }
  });
});
