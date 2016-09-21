(function () {
  'use strict';

  describe('If we are working with a map', function () {
    describe('and we are zoomed in to level 3', function () {
      var map = {
        getCurrentZoom: function() {return 3;}
      };
      it('should return the url for map layer 3', function () {
        // uses global map.getCurrentZoom
        var url = urlForCurrentZoom();
        assert.equal(url, '/zoom3');
        done();

      });
    });
  });
})();
