const google = require('./google');
const drive = google.gapis.drive('v3');

const ROLE_COMMENT = 'commenter';
const ROLE_VIEW = 'reader';
const ROLE_EDIT = 'writer';
const ROLE_ORGANIZE = 'organizer';
const ROLE_OWNER = 'owner';

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
	
	setRole(email, role) {
		if(!role) role = ROLE_VIEW;		
		this._apiCall(drive.permissions.create, {
			sendNotificationEmail: false, 
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
}

const ROOT_FOLDER = new File('1epAk56th7SwpM4cX-jl1eQyE2wFjymHJ'); // FRC Team 5669
const DESIGN_FOLDER = new File('1U0mZv2FaLM0Mu6iHfG0h3AHSaecAHxir'); // root/Design
const PROGRAMMING_FOLDER = new File('1YzGIFPZuyARPF9a8r6ha2jjnvdYuMA6o'); // root/Programming
const PUBLICITY_FOLDER = new File('1CUyQJF8mMs2Jl7dAAzWPGmo3kKq2z8yA'); // root/Publicity