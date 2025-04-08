from flask import Flask, redirect, request, url_for, session
import requests
import json

app = Flask(__name__)
app.secret_key = ''

# OAuth 2.0 credentials
CLIENT_ID = ''
CLIENT_SECRET = ''
REDIRECT_URI = 'http://localhost:5000/oauth2callback'
SCOPE = 'https://www.googleapis.com/auth/earthengine'

# Google's OAuth 2.0 endpoints
AUTH_URL = 'https://accounts.google.com/o/oauth2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'

@app.route('/')
def index():
    return 'Welcome to the OAuth 2.0 sample app! <a href="/login">Log in with Google</a>'

@app.route('/login')
def login():
    # Build the authorization URL
    auth_url = (
        f'{AUTH_URL}?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}'
        '&response_type=code&scope={scope}&access_type=offline'
    ).format(scope=SCOPE)
    return redirect(auth_url)

@app.route('/oauth2callback')
def oauth2callback():
    # Get the authorization code from the query parameters
    code = request.args.get('code')

    # Exchange the authorization code for tokens
    token_data = {
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    }

    response = requests.post(TOKEN_URL, data=token_data)
    tokens = response.json()

    # Store the tokens in the session
    session['access_token'] = tokens['access_token']
    session['refresh_token'] = tokens['refresh_token']

    return 'Logged in successfully! <a href="/refresh">Refresh Token</a>'

@app.route('/refresh')
def refresh():
    # Use the refresh token to get a new access token
    refresh_token = session.get('refresh_token')
    token_data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token'
    }

    print(refresh_token)

    response = requests.post(TOKEN_URL, data=token_data)
    new_tokens = response.json()

    # Update the access token in the session
    session['access_token'] = new_tokens['access_token']

    return 'Access token refreshed successfully!'

if __name__ == '__main__':
    app.run(debug=True)