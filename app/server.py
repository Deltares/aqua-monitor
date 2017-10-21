#!/usr/bin/env python
"""A simple example of connecting to Earth Engine using App Engine."""


# Works in the local development environment and when deployed.
# If successful, shows a single web page with the SRTM DEM
# displayed in a Google Map.  See accompanying README file for
# instructions on how to set up authentication.

import os
import datetime
from datetime import timedelta
import logging

import json

import oauth2client
import oauth2client.client

import jinja2
import webapp2

import ee

import config
import config_web

# configure logging
logging.basicConfig()
# get logger for this module)
logger = logging.getLogger(__name__)

REDUCTION_SCALE_METERS = 30

jinja_environment = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')))


class MainPageHandler(webapp2.RequestHandler):
    def get(self, name='index.html'):  # pylint: disable=g-bad-name
        """Request an image from Earth Engine and render it to a web page."""

        if not name:
            name = 'index.html'

        # parse request parameters, move to function
        view = self.request.params.get('view', '')
        view_json = '{}'

        if view:
            try:
                # assume we can split in three items
                lat, lng, zoom = view.split(',')
                # these should be floats
                lat = float(lat)
                lng = float(lng)
                # strip off the z
                zoom = int(zoom.rstrip('z'))
                # if all succeeds overwrite the string output
                view_json = json.dumps({
                    "lat": lat,
                    "lng": lng,
                    "zoom": zoom
                })
            except ValueError:
                # just log, no worries
                logger.exception('invalid view input', view)

        expire_time = datetime.datetime.now() + timedelta(seconds=config_web.EE_TOKEN_EXPIRE_IN_SEC)

        credentials = oauth2client.client.OAuth2Credentials(
            None,
            config_web.EE_CLIENT_ID,
            config_web.EE_CLIENT_SECRET,
            config_web.EE_REFRESH_TOKEN,
            expire_time,
            'https://accounts.google.com/o/oauth2/token',
            None
        )
        config_web.EE_ACCESS_TOKEN = credentials.get_access_token().access_token

        template_values = {
            'client_id': config_web.EE_CLIENT_ID,
            'token_type': config_web.EE_TOKEN_TYPE,
            'access_token': config_web.EE_ACCESS_TOKEN,
            'token_expires_in_sec': config_web.EE_TOKEN_EXPIRE_IN_SEC,
            'token_expire_time': expire_time.strftime("%A, %d. %B %Y %I:%M%p:%S"),
            'view': view_json
        }

        percentile = self.request.params.get('percentile', '')
        if percentile:
            template_values['percentile'] = int(percentile)
        else:
            template_values['percentile'] = 20

        debug = self.request.params.get('debug', '')
        if debug == 'true' or debug == '1':
            template_values['debug'] = 'true'
        else:
            template_values['debug'] = 'false'

        mode = self.request.params.get('mode', '')
        if mode == 'dynamic':
            template_values['mode'] = 'dynamic'
        else: 
            template_values['mode'] = 'static'

        refine = self.request.params.get('refine', '')
        if refine == 'false' or refine == '0':
            template_values['refine'] = 'false'
        else:
            template_values['refine'] = 'true'

        smoothen = self.request.params.get('smoothen', '')
        if smoothen == 'false' or smoothen == '0':
            template_values['smoothen'] = 'false'
        else:
            template_values['smoothen'] = 'true'

        # index of the current site
        site = self.request.params.get('site', '')
        if site:
            template_values['site'] = int(site)
        else:
            template_values['site'] = '-1'

        # slope thresholds
        slope_threshold = self.request.params.get('slope_threshold', '')
        if slope_threshold:
            template_values['slope_threshold'] = float(slope_threshold)
        else:
            template_values['slope_threshold'] = '0.03'

        slope_threshold_sensitive = self.request.params.get('slope_threshold_sensitive', '')
        if slope_threshold_sensitive:
            template_values['slope_threshold_sensitive'] = float(slope_threshold_sensitive)
        else:
            template_values['slope_threshold_sensitive'] = '0.02'

        averaging_months1 = self.request.params.get('averaging_months1', '')
        if averaging_months1:
            template_values['averaging_months1'] = float(averaging_months1)
        else:
            template_values['averaging_months1'] = 12

        averaging_months2 = self.request.params.get('averaging_months2', '')
        if averaging_months2:
            template_values['averaging_months2'] = float(averaging_months2)
        else:
            template_values['averaging_months2'] = 12

        all_years = self.request.params.get('all_years', '')
        if all_years == 'true' or all_years == 1:
            template_values['all_years'] = 'true'
        else:
            template_values['all_years'] = 'false'

        all_years_step = self.request.params.get('all_years_step', '')
        if all_years_step:
            template_values['all_years_step'] = int(all_years_step)
        else:
            template_values['all_years_step'] = 1

        min_year_selection = self.request.params.get('from', '')
        if min_year_selection:
            template_values['min_year_selection'] = min_year_selection
        else:
            template_values['min_year_selection'] = 2000

        max_year_selection = self.request.params.get('to', '')
        if max_year_selection:
            template_values['max_year_selection'] = max_year_selection
        else:
            template_values['max_year_selection'] = 2017

        min_doy = self.request.params.get('min_doy', '')
        if min_doy:
            template_values['min_doy'] = min_doy
        else:
            template_values['min_doy'] = 0

        max_doy = self.request.params.get('max_doy', '')
        if min_doy:
            template_values['max_doy'] = max_doy
        else:
            template_values['max_doy'] = 365

        min_year = self.request.params.get('min_year', '')
        if min_year:
            template_values['min_year'] = min_year
        else:
            template_values['min_year'] = 1985

        max_year = self.request.params.get('max_year', '')
        if max_year:
            template_values['max_year'] = max_year
        else:
            template_values['max_year'] = 2017

        filter_count = self.request.params.get('filter_count', '')
        if filter_count:
            template_values['filter_count'] = filter_count
        else:
            template_values['filter_count'] = 0

        ndvi_filter = self.request.params.get('ndvi_filter', '')
        if ndvi_filter:
            template_values['ndvi_filter'] = ndvi_filter
        else:
            template_values['ndvi_filter'] = -99

        water_slope_opacity = self.request.params.get('water_slope_opacity', '')
        if water_slope_opacity:
            template_values['water_slope_opacity'] = water_slope_opacity
        else:
            template_values['water_slope_opacity'] = 0.4

        template = jinja_environment.get_template(name)
        logger.info("template: %s", template)
        self.response.out.write(template.render(template_values))


def GetWetnessTimeSeries(aoi, begin, end):
    collections = [
        ['LANDSAT/LT4_L1T_TOA', ['B5', 'B2']],
        ['LANDSAT/LT5_L1T_TOA', ['B5', 'B2']],
        ['LANDSAT/LE7_L1T_TOA', ['B5', 'B2']],
        ['LANDSAT/LC8_L1T_TOA', ['B6', 'B3']],
    ]

    ic = ee.ImageCollection([])
    for n in collections:
        ic = ee.ImageCollection(ic.merge(ee.ImageCollection(n[0]).filterDate(begin, end).filterBounds(aoi) \
                                         .select(n[1], ['swir', 'green'])))

    def ComputeNdwi(img):
        reduction = img \
            .normalizedDifference(['swir', 'green']) \
            .rename(['ndwi']) \
            .reduceRegion(ee.Reducer.first(), aoi, REDUCTION_SCALE_METERS)

        return ee.Feature(None, {'ndwi': reduction,
                                 'system:time_start': img.get('system:time_start')})

    results = ic.map(ComputeNdwi).getInfo()

    # Extract the results as a list of lists.
    def ExtractProperties(feature):
        return {'date': feature['properties']['system:time_start'],
                'value': feature['properties']['ndwi']['ndwi']}

    return map(ExtractProperties, results['features'])


def GetImageInfoTimeSeries(aoi):
    def GetImageInfo(img):
        return ee.Feature(None, {
            'id': img.get('system:id'),
            'time': img.get('system:time_start'),
            'cloud_cover': img.get('CLOUD_COVER')
        })

    def ToFeatureCollection(imageCollectionName):
        return ee.FeatureCollection(ee.ImageCollection(imageCollectionName).filterBounds(aoi).map(GetImageInfo))

    collectionNames = [
        'LANDSAT/LT4_L1T_TOA',
        'LANDSAT/LT5_L1T_TOA',
        'LANDSAT/LE7_L1T_TOA',
        'LANDSAT/LC8_L1T_TOA'
    ]

    fc = ee.FeatureCollection([])
    for n in collectionNames:
        fc = fc.merge(ToFeatureCollection(n))

    info = fc.sort('time').getInfo()

    return [i['properties'] for i in info['features']]


class GetImageInfoHandler(webapp2.RequestHandler):
    """A servlet to handle requests for details about a set of images."""

    def get(self):
        """Returns details about a polygon."""

        aoiJson = json.loads(self.request.get('aoi'))
        aoi = ee.Geometry.Polygon(aoiJson['features'][0]['geometry']['coordinates'])

        content = GetImageInfoTimeSeries(aoi)
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))


# TODO: move these to tested utility script
def get_image_list(bounds, collection='LANDSAT/LC8_L1T_TOA'):
    images = ee.ImageCollection(collection).filterBounds(bounds)
    features = ee.FeatureCollection(images)
    image_info = features.map(lambda img: ee.Feature(None, {
        'id': img.get('system:id'),
        'time': img.get('system:time_start'),
        'cloud_cover': img.get('CLOUD_COVER')
    }))
    info = image_info.getInfo()
    return [i['properties'] for i in info['features']]


class GetWetnessTimeSeriesHandler(webapp2.RequestHandler):
    """Gets wetness time series for a given location."""

    def get(self):
        """Returns details about a polygon."""
        request = self.request

        pointJson = json.loads(self.request.get('location'))
        aoi = ee.Geometry.Point(pointJson['lat'], pointJson['lng'])

        begin = self.request.get('begin')
        end = self.request.get('end')

        content = GetWetnessTimeSeries(aoi, begin, end)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))

        self.response.headers['Content-Type'] = 'application/json'
        self.response.headers['Content-Disposition'] = 'attachment; filename="data.json"'


class RefreshAccessToken(webapp2.RequestHandler):
    def post(self):
        self.redirect('/')


app = webapp2.WSGIApplication([
    ('/get_aoi_image_info_time_series', GetImageInfoHandler),
    ('/get_ndwi_time_series', GetWetnessTimeSeriesHandler),
    # html pages in current directory
    ('/(.*\.html)', MainPageHandler),
    ('/', MainPageHandler)
], debug=True)

# Initialize the EE API.
# Use our App Engine service account's credentials.
EE_CREDENTIALS = ee.ServiceAccountCredentials(config.EE_ACCOUNT, config.EE_PRIVATE_KEY_FILE)

ee.Initialize(EE_CREDENTIALS)
