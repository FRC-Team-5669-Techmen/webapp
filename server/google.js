const fs = require('fs');
const gapis = require('googleapis');
const GoogleAuth = require('google-auth-library');
const path = require('path');

// Service account initialization.
const sadata = JSON.parse(fs.readFileSync('../private/service-account-data.json'));
const jwtClient = new gapis.auth.JWT(
		sadata.client_email,
		null,
		sadata.private_key,
		['https://www.googleapis.com/auth/spreadsheets',
			'https://www.googleapis.com/auth/drive']);
jwtClient.authorize((err, tokens) => {
	if (err) {
		console.log(err);
	} else {
		console.log('Connected to Google via service account.');
	}
})

// OAuth client setup (used to validate user logins.)
const CLIENT_ID = '1056552383797-n6uq3md5vml5k1jai947eh7v2pq8k958.apps.googleusercontent.com';
const auth = new GoogleAuth;
const client = new auth.OAuth2(CLIENT_ID, '', '');
// Callback is given the contents of the token if it is valid, null if not
const verify = function(token, callback) {
	client.verifyIdToken(token, CLIENT_ID, function(e, payload) {
		if(e) {
			callback(null);
		} else {
			payload = payload._payload;
			callback(payload);
		}
	});
}

module.exports.gapis = gapis;
module.exports.jwtClient = jwtClient;
module.exports.CLIENT_ID = CLIENT_ID; 
module.exports.verify = verify;
