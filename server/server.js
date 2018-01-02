const fs = require('fs');
const https = require('https');
const path = require('path');
//Express framework stuff
const bodyParser = require('body-parser');
const compression = require('compression');
const express = require('express');

const google = require('./google');
const sd = require('./sheetDatabase');
const drive = require('./drive')
const dbs = require('./databases');

const rootDir = path.resolve(__dirname + '/../dist'); // ../ causes problems, because it is susceptible to exploitation.

// Begin testing area

// End testing area

var app = express();
app.use(compression());
app.use(bodyParser.json({type:"*/*"}));
app.use(bodyParser.urlencoded({
	extended: true
}));

let requestLogger = function (req, res, next) {
	console.log(req.ip || req.ips, req.method, req.path);
	if(req.body && Object.keys(req.body).length != 0) console.log('body:', req.body);
	next();
}
app.use(requestLogger);

// API code.
const ACCESS_LEVEL_VISITOR = 'visitor', ACCESS_LEVEL_RESTRICTED = 'restricted', ACCESS_LEVEL_MEMBER = 'member' 
	ACCESS_LEVEL_LEADER = 'leader';

// Callback is passed the contents of the token in the authorization header of req if successful, null if not, and
// undefined if header is not present.
function validateAuthorization(req, callback) {
	const authorization = req.get('authorization');
	if(!authorization) {
		callback(undefined);
		return;
	}
	const split = authorization.split(' ');
	const method = split[0], token = split[1];
	google.verify(token, callback);
}

// Next is a (member?: Member) => void function called when it is determined the user meets access requirements.
// member is only passed to next if access level is greater than ACCESS_LEVEL_VISITOR.
function checkLogin(req, res, accessLevel, next) {
	if(accessLevel == ACCESS_LEVEL_VISITOR) {
		next();
		return;
	}
	validateAuthorization(req, (content) => {
		if(!content || !content.email_verified) {
			res.status(401).send({error: 'A valid Google login token is required for authorization.'});
			return;			
		}
		dbs.members.findItemWithValue('emailAddress', content.email, (item) => {
			if(!item) { // User is not registered.
				res.status(403).send({error: 'This action requires that the user have signed up, which they have not done.'});
				return;
			}
			// If leadership / membership not required, don't check those.
			if(accessLevel == ACCESS_LEVEL_RESTRICTED) {
				next(item);
				return;
			}
			if(item.accessLevel == ACCESS_LEVEL_LEADER) { // Leaders can access anything, no matter what.
				next(item);
			} else if((item.accessLevel == ACCESS_LEVEL_MEMBER) && (accessLevel == ACCESS_LEVEL_MEMBER)) {
				// Members can access member-level and below stuff. (Below stuff handled earlier.)
				next(item);
			} else {
				if(accessLevel == ACCESS_LEVEL_LEADER) {
					res.status(403).send({error: 'This action requires the current user to be a leader.'});
				} else {
					res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by a leader, which has not happened.'});
				}
			}
		});
	});
}

app.get('/api/v1/accessLevel', (req, res) => {
	validateAuthorization(req, (content) => {
		if(!content || !content.email_verified) {
			res.status(201).send({accessLevel: ACCESS_LEVEL_VISITOR});
			return;
		}
		dbs.members.findItemWithValue('emailAddress', content.email, (item) => {
			if(!item) { // Not registered.
				res.status(201).send({accessLevel: ACCESS_LEVEL_VISITOR});			
			} else {
				res.status(201).send({accessLevel: item.accessLevel});
			}
		});
	});
});

app.post('/api/v1/members/register', (req, res) => {
	data = req.body;
	data.emailAddress = data.emailAddress.toLowerCase();
	validateAuthorization(req, (content) => {
		if(!content || !content.email_verified) {
			res.status(401).send({error: 'A valid Google login token is required for authorization.'});			
		}
		if(content.email != data.emailAddress) {
			res.status(403).send({error: 'The email address of the user must match the email address of the auth token.'});
			return;
		}
		dbs.members.getAllValues('emailAddress', (values) => {
			if(values.indexOf(data.emailAddress) != -1) {
				res.status(400).send({error: 'A member with that email address already exists.'});
				return;
			}
			// This could be set to ACCESS_LEVEL_LEADER by a 1337 hacker trying to get access, so make sure it is set to RESTRICTED.
			data.accessLevel = ACCESS_LEVEL_RESTRICTED;
			data.profilePicture = content.picture
			dbs.members.push(data);
			dbs.members.getSize((size) => {
				dbs.members.getItem(size - 1, (item) => {
					res.status(201).send(item);
				});
			});
		});
	});
});

app.get('/api/v1/members/list', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (_) => {
		dbs.members.getSize((size) => {
			dbs.members.getItems(0, size, (data) => {
				// Only show some information, use /members/:email to get more.
				let trimmedData = [];
				for (let member of data) {
					member.parentName = undefined;
					member.parentPhone = undefined;
					member.parentEmail = undefined;
					member.phone = undefined;
					member.wantsEmails = undefined;
					trimmedData.push(member);
				}
				res.status(200).send(trimmedData);
			});
		});
	});
});

app.get('/api/v1/members/:email', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_RESTRICTED, (member) => {
		let address = req.params.email;
		if((address != member.emailAddress) && (member.accessLevel == ACCESS_LEVEL_RESTRICTED)) {
			res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by a leader, which has not happened.'});
		}
		dbs.members.getAllValues('emailAddress', (values) => {
			let index = values.indexOf(address);
			if (index == -1) {
				res.status(404).send({error: 'No members have that email address.'});
			} else {
				dbs.members.getItem(index, (data) => {
					if((member.emailAddress !== address) && (member.accessLevel !== ACCESS_LEVEL_LEADER)) {
						// Censor sensitive or useless information.
						data.parentName = undefined;
						data.parentPhone = undefined;
						data.parentEmail = undefined;
						data.phone = undefined;
						data.wantsEmails = undefined;
					}
					res.status(200).send(data);
				});
			}
		});
	});	
});

function getTeamFolder(member) {
	switch (member.preferredTeam) {
	case 'Design':
		return drive.DESIGN_FOLDER;
	case 'Programming':
		return drive.PROGRAMMING_FOLDER;
	case 'Publicity':
		return drive.RESOURCES_FOLDER;
	default:
		return null;
	}
}

app.patch('/api/v1/members/:email', (req, res) => {
	const data = req.body;
	// If the user wants to modify the access level or the team of a member, they must be a leader.
	checkLogin(req, res, (data.accessLevel || data.preferredTeam) ? ACCESS_LEVEL_LEADER : ACCESS_LEVEL_MEMBER, (member) => {
		let address = req.params.email;
		if((member.emailAddress !== address) && (member.accessLevel != ACCESS_LEVEL_LEADER)) {
			res.status(403).send({error: 'Only leaders can edit details of users other than themselves.'});
		}
		dbs.members.getAllValues('emailAddress', (values) => {
			let index = values.indexOf(address);
			if (index == -1) {
				res.status(404).send({error: 'No members have that email address.'});
			} else {
				dbs.members.getItem(index, (item) => {
					// If their access level was changed, need to change what they have access to on google drive.
					if((data.accessLevel) && (data.accessLevel !== item.accessLevel)) {
						// Handles changing google drive access if access level changes.
						// If member's team also changes in the same request, that is handled here as well.
						if(data.accessLevel === ACCESS_LEVEL_RESTRICTED) {
							if(item.accessLevel === ACCESS_LEVEL_MEMBER) {
								let teamFolder = getTeamFolder(item); // What team they were
								if(teamFolder) teamFolder.removeRole(item.emailAddress);
								drive.COMPETITION_FOLDER.removeRole(item.emailAddress);
							} else { // Was a leader
								drive.ROOT_FOLDER.removeRole(item.emailAddress);
								drive.ADMINISTRATION_FOLDER.removeRole(item.emailAddress);
							}
						} else if (data.accessLevel == ACCESS_LEVEL_MEMBER) {
							if(item.accessLevel === ACCESS_LEVEL_LEADER) {
								drive.ROOT_FOLDER.removeRole(item.emailAddress);
								drive.ADMINISTRATION_FOLDER.removeRole(item.emailAddress);
							}
							let teamFolder = getTeamFolder({preferredTeam: data.preferredTeam || item.preferredTeam}); // In case their team was also changed.
							if(teamFolder) teamFolder.setRole(item.emailAddress, drive.ROLE_EDIT,
									'Your application for FRC has been approved, and you can now create and modify files in your team\'s folder.');
							drive.COMPETITION_FOLDER.setRole(item.emailAddress, drive.ROLE_EDIT, 
									'Your application for FRC has been approved, and you can now create and modify files in the Competition folder.');
						} else { // Becoming a leader
							if(item.accessLevel === ACCESS_LEVEL_MEMBER) {
								let teamFolder = getTeamFolder(item); // What team they were
								if(teamFolder) teamFolder.removeRole(item.emailAddress);
								drive.COMPETITION_FOLDER.removeRole(item.emailAddress);
							}
							drive.ROOT_FOLDER.setRole(item.emailAddress, drive.ROLE_EDIT,
									'You have been promoted to a leader of FRC and can now create, edit, and delete files in all folders.');
							drive.ADMINISTRATION_FOLDER.setRole(item.emailAddress, drive.ROLE_EDIT,
									'You have been promoted to a leader of FRC and now have access to the (previously hidden) Administration folder.');
						}
					} else if ((data.preferredTeam) && (data.preferredTeam !== item.preferredTeam) && (item.accessLevel === ACCESS_LEVEL_MEMBER)) {
						// Handles gdrive permissions if a member changes teams but not access levels.
						let oldFolder = getTeamFolder(item);
						if(oldFolder) oldFolder.removeRole(item.emailAddress);
						let newFolder = getTeamFolder(data);
						if(newFolder) newFolder.setRole(item.emailAddress, drive.ROLE_EDIT,
								'Your FRC subteam has been switched to ' + data.preferredTeam + ', and you have thus been granted access to its folder.');
					}
					for(let key in data) {
						if((key != 'auth') && (key != 'emailAddress')) {
							item[key] = data[key];
						}
					}
					dbs.members.setItem(index, item);
					res.status(200).send(item);
				});
			}
		});
	});	
});

app.get('/assets/*', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*.js', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*.css', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));

// Arg 0 is node. Arg 1 is script name. This code will switch how the server runs depending on whether or not arg2 is 'prod' (production mode)
if ((process.argv.length >= 3) && (process.argv[2].toLowerCase() == 'prod')) {
	// Just bumps the user to HTTPS. Serves no content.
	console.log('Starting in production mode.');
	var redirector = express();
	redirector.get('*', (req, res) => {
		res.redirect('https://' + req.headers.host + req.url);
	});
	redirector.listen(80);

	https.createServer({
		key: fs.readFileSync('../private/key.pem'),
		cert: fs.readFileSync('../private/cert.pem')
	}, app).listen(443);	
} else {
	console.log('Starting in development mode');
	app.listen(4200);
}

console.log('Initialization complete!');