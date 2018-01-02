const google = require('./google');
const drive = google.gapis.drive('v3');

module.exports.ROLE_COMMENT = 'commenter';
module.exports.ROLE_VIEW = 'reader';
module.exports.ROLE_EDIT = 'writer';
module.exports.ROLE_ORGANIZE = 'organizer';
module.exports.ROLE_OWNER = 'owner';

class File {
	constructor(fileId) {
		this.id = fileId;
	}
	
	_apiCall(func, data, callback) {
		data.auth = google.jwtClient;
		data.fileId = this.id;
		func(data, (err, res) => {
			if(err) {
				console.error('Error in Drive API call: ' + err);
			} else {
				callback(res);
			}
		})
	}
	
	setDefaultRole(role) {
		throw new Exception('NYI');
	}
	
	setRole(email, role, message) {
		if(!role) role = ROLE_VIEW;		
		this._apiCall(drive.permissions.create, {
			sendNotificationEmail: !!message,
			emailMessage: message ,
			resource: {
				role: role,
				type: 'user',
				emailAddress: email
			}}, (res) => {
				// For some reason, demoting privilege only works with an update.
				if(res && res.role != role) {
					this._apiCall(drive.permissions.update, {
						permissionId: res.id,
						resource: {role: role}
					}, (res) => console.log(res));
				}
			});
	}
	
	listPerms(callback) {
		this._apiCall(drive.permissions.list, {
			fields: 'permissions(id,type,emailAddress,role)'
		}, (res) => callback(res.permissions));
	}
	
	removeRole(email) {
		this.listPerms((perms) => {
			if(!perms.find) console.log(perms)
			let perm = perms.find((perm) => (perm.emailAddress)? perm.emailAddress.toLowerCase() === email : false);
			if(perm) {
				this._apiCall(drive.permissions.delete, {
					permissionId: perm.id
				}, () => null);				
			}
		});
	}
}

module.exports.ROOT_FOLDER = new File('1epAk56th7SwpM4cX-jl1eQyE2wFjymHJ'); // FRC Team 5669
module.exports.DESIGN_FOLDER = new File('1U0mZv2FaLM0Mu6iHfG0h3AHSaecAHxir'); // root/Design
module.exports.PROGRAMMING_FOLDER = new File('1YzGIFPZuyARPF9a8r6ha2jjnvdYuMA6o'); // root/Programming
module.exports.PUBLICITY_FOLDER = new File('1CUyQJF8mMs2Jl7dAAzWPGmo3kKq2z8yA'); // root/Publicity
module.exports.COMPETITION_FOLDER = new File('1uF-6xoBytWaicepNX0d0VkzByG7xcTzE'); // root/Competition
module.exports.ADMINISTRATION_FOLDER = new File('1ZiM6qKk5s__Ip1bItigVgn-jEzreLPod'); // root/Administration