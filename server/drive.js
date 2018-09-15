const google = require('./google');
const drive = google.gapis.drive('v3');
const miscConfig = require('./databases').miscConfig;

module.exports.ROLE_NONE = 'none';
module.exports.ROLE_COMMENT = 'commenter';
module.exports.ROLE_VIEW = 'reader';
module.exports.ROLE_EDIT = 'writer';
module.exports.ROLE_ORGANIZE_FILES = 'fileOrganizer'; // Only works on Team Drives
module.exports.ROLE_ORGANIZE = 'organizer'; // Like fileOrganizer, but also allows adding / removing members.
module.exports.ROLE_OWNER = 'owner'; // Not allowed in Team Drives

class File {
	constructor(fileId, fileName) {
		this.id = fileId;
		this.name = (fileName) ? fileName : null;
		if (!fileName) {
			this.getName();
		}
	}
	
	_apiCall(func, data) {
		data.auth = google.jwtClient;
		data.fileId = '0AJgNHQkGIBW8Uk9PVA';
		data.supportsTeamDrives = true;
		let promise = new Promise((resolve, reject) => {
			func(data, (err, res) => {
				if (err) {
					reject(err);
				} else {
					resolve(res);
				}
			});
		});
		promise.catch(console.error);
		return promise;
	}
	
	setDefaultRole(role) {
		throw new Error('NYI');
	}
	
	setRole(email, role, message) {
		if (role === module.exports.ROLE_NONE) {
			this.removeRole(email);
			return;
		}
		// TODO: Read existing permissions.
		if (!role) role = ROLE_VIEW;
		const body = {
			sendNotificationEmail: !!message,
			resource: {
				role: role,
				type: 'user',
				emailAddress: email
			}
		};
		if (message) body.emailMessage = message;
		return this._apiCall(drive.permissions.create, body).then((res) => {
			// For some reason, demoting privilege only works with an update.
			if(res && res.role != role) {
				return this._apiCall(drive.permissions.update, {
					permissionId: res.id,
					requestBody: {role: role}
				});
			} else {
				return res;
			}
		});
	}
	
	listPerms() {
		return this._apiCall(drive.permissions.list, {
			fields: 'permissions(id,type,emailAddress,role)',
			pageSize: 100
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
			q: `"${this.id}" in parents`
		}).then((res) => {
			let parsed = [];
			for (let file of res.files) {
				parsed.push(new File(file.id, file.name));
			}
			return parsed;
		});
	}
	
	pollName() {
		return this.name;
	}
	
	getName() {
		return this._apiCall(drive.files.get, {
			fileId: this.id
		}).then((file) => {
			this.name = file.name;
			return file.name;
		});
	}
}

module.exports.getDrives = function() {
	return File.prototype._apiCall(drive.teamdrives.list, {
		pageSize: 100,
		supportsTeamDrives: true
	}).then((res) => {
		let out = [];
		for (let item of res.teamDrives) {
			out.push(new File(item.id, item.name));
		}
		return out;
	});
}