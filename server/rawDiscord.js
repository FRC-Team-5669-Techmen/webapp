const request = require('request');

const CLIENT_DATA = require('../private/discord-app-data.json');
const CLIENT_ID = CLIENT_DATA.clientId, CLIENT_SECRET = CLIENT_DATA.clientSecret;
const SCOPES = 'identify email guilds guilds.join';

module.exports.exchangeToken = function(authToken, redirectHost, callback) {
	request({
		url: 'https://discordapp.com/api/oauth2/token',
		method: 'POST',
		qs: {
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: authToken,
			redirect_uri: redirectHost + '/api/v1/discord/authCallback',
			scope: SCOPES
		},
		json: true
	}, (err, res, body) => {
		if (err) throw err;
		callback(body);
	});
}