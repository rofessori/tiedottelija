const { google } = require('googleapis');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const CREDENTIALS_PATH = '/app/secrets/google_credentials.json';
const TOKEN_PATH = '/app/secrets/google_token.json';

let auth = null;

function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    auth = oAuth2Client;
  } else {
    getAccessToken(oAuth2Client);
  }
}

function getAccessToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  // You'll need to manually complete the authorization flow and save the token
}

function addEventToCalendar(event) {
  if (!auth) {
    console.error('Authentication not set up. Run authorize() first.');
    return;
  }

  const calendar = google.calendar({ version: 'v3', auth });
  calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  }, (err, res) => {
    if (err) return console.error('Error adding event to calendar:', err);
    console.log('Event added to calendar:', res.data);
  });
}

module.exports = { authorize, addEventToCalendar };