const memberDatabase = require('./databases').members;

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
				let member = memberDatabase.findItemWithValue('id', this.memberid);
				return (member) ? member.level : ACCESS_LEVEL_VISITOR;
			}
	};
	sessions.push(session);
	return session;
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