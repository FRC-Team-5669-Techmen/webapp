const changeGuard = require('./changeGuard');
const FileDatabase = require('./fileDatabase').FileDatabase;

function generateRandomToken() {
	let token = '';
	const CHARS = 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789';
	for (let i = 0; i < 64; i++) {
		token += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
	}
	return token;
}

module.exports.members = new FileDatabase('../private/members.json');
module.exports.members.createMember = function() {
	let member = {
		id: generateRandomToken(),
		firstName: null,
		lastName: null,
		shirtSize: null,
		emailAddress: null,
		sendEmails: null,
		phone: null,
		gradeLevel: null,
		team: null,
		experience: null,
		parent: {
			firstName: null,
			lastName: null,
			phone: null,
			emailAddress: null
		},
		accessLevel: 'restricted',
		connections: {
			discord: {
				id: null,
				refreshToken: null,
				accessToken: null,
				accessTokenExp: null,
				avatar: null
			}
		}
	};
	this.push(member);
	return changeGuard(member, () => this._markDirty());
}
module.exports.roleExtras = new FileDatabase('../private/roleExtras.json');
/*
 * Example google drive permission: {
 *   fileId: 'asldkfjlaskdjf',
 *   access: drive.ROLE_NONE // or drive.ROLE_COMMENT or drive.ROLE_VIEW, etc. Folders can only have ROLE_NONE, ROLE_VIEW, and ROLE_EDIT.
 * }
 */
module.exports.roleExtras.createRole = function(options) {
	let role = {
		discordId: null,
		minimumAccessLevel: 'visitor',
		googleDriveAccess: [],
		
	}
	for (let key in options) {
		role[key] = options[key];
	}
	this.push(role);
	return changeGuard(role, () => this._markDirty())
}
module.exports.partVendors = new FileDatabase('../private/partVendors.json');
module.exports.partRequests = new FileDatabase('../private/partRequests.json');
module.exports.miscConfig = new FileDatabase('../private/miscConfig.json');
module.exports.miscConfig.get = function(key, callback) {
	this.getItem(0, (item) => {
		callback(item[key]);
	})
}
module.exports.miscConfig.set = function(key, value, callback) {
	this.getItem(0, (item) => {
		item[key] = value;
		callback();
	})
}