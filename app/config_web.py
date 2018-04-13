import json

keys = json.loads(open('privatekey-web.json').read())

EE_CLIENT_ID = keys["EE_CLIENT_ID"]
EE_CLIENT_SECRET = keys["EE_CLIENT_SECRET"]
EE_REFRESH_TOKEN = keys["EE_REFRESH_TOKEN"]
EE_TOKEN_TYPE = 'Bearer'
EE_TOKEN_EXPIRE_IN_SEC = 36000
EE_ACCESS_TOKEN = ''
