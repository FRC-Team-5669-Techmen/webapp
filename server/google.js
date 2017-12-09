const fs = require('fs');
const gapis = require('googleapis');
const path = require('path');

const sadata = JSON.parse(fs.readFileSync('../private/service-account-data.json'));
const jwtClient = new gapis.auth.JWT(
		sadata.client_email,
		null,
		sadata.private_key,
		['https://www.googleapis.com/auth/spreadsheets']);
jwtClient.authorize((err, tokens) => {
	if (err) {
		console.log(err);
	} else {
		console.log('Connected to Google via service account.');
	}
})

module.exports.gapis = gapis;
module.exports.jwtClient = jwtClient;
