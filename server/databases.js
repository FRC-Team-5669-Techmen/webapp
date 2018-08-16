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
module.exports.partVendors = new FileDatabase('../private/partVendors.json');
module.exports.partRequests = new FileDatabase('../private/partRequests.json');