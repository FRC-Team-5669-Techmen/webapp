const google = require('./google');
const drive = google.gapis.drive('v3');
const miscConfig = require('./databases').miscConfig;

module.exports.ROLE_NONE = 'none';
module.exports.ROLE_COMMENT = 'commenter';
module.exports.ROLE_VIEW = 'reader';
module.exports.ROLE_EDIT = 'writer';
module.exports.ROLE_ORGANIZE = 'organizer';
module.exports.ROLE_OWNER = 'owner';

class File {
	constructor(fileId) {
		this.id = fileId;
	}
	
	_apiCall(func, data) {
		data.auth = google.jwtClient;
		data.fileId = this.id;
		let promise = func(data);
		promise.catch(console.error);
		return promise;
	}
	
	setDefaultRole(role) {
		throw new Error('NYI');
	}
	
	setRole(email, role, message) {
		if (role === ROLE_NONE) {
			this.removeRole(email);
			return;
		}
		if (!role) role = ROLE_VIEW;
		return this._apiCall(drive.permissions.create, {
			sendNotificationEmail: !!message,
			emailMessage: message ,
			resource: {
				role: role,
				type: 'user',
				emailAddress: email
			}
		}).then((res) => {
			// For some reason, demoting privilege only works with an update.
			if(res && res.role != role) {
				return this._apiCall(drive.permissions.update, {
					permissionId: res.id,
					resource: {role: role}
				});
			} else {
				return res;
			}
		});
	}
	
	listPerms() {
		return this._apiCall(drive.permissions.list, {
			fields: 'permissions(id,type,emailAddress,role)'
		}).then((res) => res.permissions);
	}
	
	removeRole(email) {
		this.listPerms().then((perms) => {
			if(!perms.find) console.error(perms, 'Does not have attribute "find".');
			let perm = perms.find((perm) => (perm.emailAddress)? perm.emailAddress.toLowerCase() === email : false);
			if(perm) {
				return this._apiCall(drive.permissions.delete, {
					permissionId: perm.id
				});				
			}
			return Promise.reject('Promise not found.');
		});
	}
	
	listChildren() {
		return this._apiCall(drive.files.list, {
			q: `${this.id} in parents`
		});
	}
}

module.exports.getRootFolder = function() {
	return new Promise((resolve, reject) => {
		miscConfig.get('google', (gconfig) => {
			resolve(new File(gconfig.rootFolder));
		})
	});
}
