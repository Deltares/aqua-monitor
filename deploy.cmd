cd dist 
rem gcloud app deploy --project aqua-monitor
gcloud app deploy --project aqua-monitor -v upgrade-ee --bucket gs://aqua-monitor-src