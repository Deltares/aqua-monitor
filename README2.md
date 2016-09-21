# aqua-monitor
Monitoring surface water changes from space at global scale

# How to build?

The build scripts of the Aqua Monitor, make sure to install Node.js (used only to build everything). Then run the following:

* npm install - downloads and installs all packages required to build the app (see packages.json)
* bower install - downloads and installs all client-side packages (see bower.json)

After that:

* gulp build - compiles everything (minifies code, generates styles, etc.) and places results in dist/

The resulting dist/ directory can be used to deploy everything as Google App Engine.

Use "gulp watch" to monitor sources continuously during development - they will be automatically compiled into dist/ on every change. 
See gulpfile.babel.js for the rules used to do this.

# How to run and deploy?

To deploy the Aqua Monitor under Google App Engine. The following files need to be added / modified:

* app/privatekey.pem - add your service account key, this is used by Python backend.
* app/config_web.py - add your client id, secret and refresh token, used at runtime to generate access to GEE for the JavaScript code. 




