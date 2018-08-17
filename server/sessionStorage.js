const memberDatabase = require('./databases').members;
const rawDiscord = require('./rawDiscord');

var sessions = [];
const ACCESS_LEVEL_VISITOR = 'visitor', ACCESS_LEVEL_RESTRICTED = 'restricted', ACCESS_LEVEL_MEMBER = 'member' 
	ACCESS_LEVEL_LEADER = 'leader';

function generateRandomToken() {
	let token = '';
	const CHARS = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789';
	for (let i = 0; i < 64; i++) {
		token += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
	}
	return token;
}

module.exports.createNewSession = function() {
	let session = {
		token: generateRandomToken(),
		memberId: null,
		started: Date.now(),
		lastRefresh: Date.now(),
		get accessLevel() {
			let member = memberDatabase.findItemWithValue('id', this.memberId);
			return (member) ? member.level : ACCESS_LEVEL_VISITOR;
		},
		getDiscordAuthToken: function(redirectHost, callback) {
			memberDatabase.findItemWithValue('id', this.memberId, (member) => {
				if (member.connections.discord.accessTokenExp < (Date.now() / 1000 + 60 * 60 * 12)) { // Its 12 hours from expiring, refresh it. (They last a week.)
					rawDiscord.getNewToken(member.connections.discord.refreshToken, redirectHost, (tokenData) => {
						member.connections.discord.accessToken = tokenData.access_token;
						member.connections.discord.accessTokenExp = Date.now() / 1000 + tokenData.expires_in;
						callback(tokenData.access_token);
					});
				} else {
					callback(member.connections.discord.accessToken);
				}
			});
		}
	};
	sessions.push(session);
	return session;
}

if (!productionMode) {
	module.exports.createNewSession();
	ts = sessions[sessions.length - 1];
	ts.token = 'abc123def420';
	ts.memberId = 'OsISBaYSPgBT7fdvBQYCypXocBt2QgpGTdK6CQ1mNihO47jXElhG6Wcvj6gHLiQ1';
}

module.exports.getSessionByToken = function(token) {
	for (let session of sessions) {
		if (session.token === token) {
			return session;
		}
	}
	return undefined;
}

module.exports.sessionExists = function(token) {
	for (let session of sessions) {
		if (session.token === token) {
			return true;
		}
	}
	return false;
}

module.exports.storeDataInSession = function(sessionToken, key, data) {
	module.exports.getSessionByToken(sessionToken)[key] = data;
}

module.exports.retrieveDataFromSession = function(sessionToken, key) {
	return module.exports.getSessionByToken(sessionToken)[key];
}