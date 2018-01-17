global.productionMode = (process.argv.length >= 3) && (process.argv[2].toLowerCase() == 'prod');

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
const pdf = require('./pdf');

const rootDir = path.resolve(__dirname + '/../dist'); // ../ causes problems, because it is susceptible to exploitation.

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
	const authorization = req.get('authorization') || req.query.authorization;
	if(!authorization) {
		callback(undefined);
		return;
	}
	const split = authorization.split(' ');
	let method, token;
	if(split.length === 1) {
		token = split[0];
	} else {
		method = split[0];
		token = split[1];
	}
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

app.get('/api/v1/vendors/list', (req, res) => {
	dbs.partVendors.getAllItems((items) => {
		res.status(200).send(items);
	})
})

app.get('/api/v1/vendors/:name', (req, res) => {
	const name = req.params.name;
	dbs.partVendors.getAllValues('vendorName', (values) => {
		const index = values.indexOf(name);
		if (index === -1) {
			res.status(404).send({error: 'There is no vendor with that name.'});
		} else {
			dbs.partVendors.getItem(index, (item) => {
				res.status(200).send(item);
			})
		}
	});
});

app.get('/api/v1/partRequests/list', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (member) => {
		dbs.partRequests.getAllItems((items) => {
			let trimmedData = [];
			// Only show some data, use /partRequests/:id to get more info
			for (let item of items) {
				item.itemNumber = undefined;
				item.taxExempt = undefined;
				if(item.requestedBy !== member.emailAddress) {
					item.requestedBy = undefined;
					item.dateRequested = undefined;
				}
				trimmedData.push(item);
			}
			res.status(200).send(trimmedData);
		});
	});
});

const STATUS_PENDING = 'Pending', STATUS_ORDERED = 'Order Submitted', STATUS_RESOLVED = 'Parts Received'

app.post('/api/v1/partRequests/create', (req, res) => {
	const data = req.body;
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (member) => {
		// Generate random 10 digit number from decimal part of random float.
		data.requestId = Math.random().toString().slice(2, 12);
		data.requestedBy = member.emailAddress;
		data.dateRequested = (new Date()).toString();
		data.status = STATUS_PENDING;
		dbs.partRequests.push(data);
		res.status(201).send(data);
	});
});

// Parameters are passed as query strings because I can't get TS to download files.
app.get('/api/v1/partRequests/generateForm', (req, res) => {
	const ids = req.query.include;
	const auth = req.query.authToken;
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		dbs.partRequests.getAllItems((requests) => {
			let toList = [];
			for(let i = 0; i < requests.length; i++) {
				if(ids.indexOf(requests[i].requestId) !== -1) {
					toList.push(requests[i]);
					dbs.partRequests.set(i, 'status', STATUS_ORDERED);
				}
			}
			dbs.partVendors.getAllItems((vendorList) => {
				pdf.createAndSendPurchaseForm(vendorList, toList, res);
			});
		});
	});
});

app.get('/api/v1/partRequests/:id', (req, res) => {
	const id = req.params.id;
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (member) => {
		dbs.partRequests.findItemWithValue('requestId', id, (item) => {
			if (!item) {
				res.status(404).send({error: 'There is no part request with id ' + id + '.'});
				return;
			}
			if (member.accessLevel !== ACCESS_LEVEL_LEADER) {
				if(item.requestedBy !== member.emailAddress) {
					// So that client can check if it belongs to the current member.
					item.requestedBy = undefined;
					item.dateRequested = undefined;
				}
			}
			res.status(200).send(item);
		})
	});
});

app.patch('/api/v1/partRequests/:id', (req, res) => {
	const data = req.body;
	let id = req.params.id;
	dbs.partRequests.getAllValues('requestId', (values) => {
		const index = values.indexOf(id);
		if (index === -1) {
			res.status(404).send({error: 'There is no part request with that ID.'});
		} else {
			dbs.partRequests.getItem(index, (item) => {
				if (item.status === STATUS_ORDERED) {
					res.status(423).send({error: 'This part request has already been submitted to the vendor, so it cannot be changed.'});
					return;
				} else if (item.status === STATUS_RESOLVED) {
					res.status(423).send({error: 'This part request has already been fulfilled, so it cannot be changed.'});
					return;			
				}
				checkLogin(req, res, ACCESS_LEVEL_MEMBER, (member) => {
					if ((item.requestedBy !== member.emailAddress) && (member.accessLevel !== ACCESS_LEVEL_LEADER)) {
						res.status(403).send({error: 'The member must be a leader to be able to edit part requests created by other members.'});
						return;
					}
					// Do not overwrite things that should not be overwritten.
					data.requestId = undefined;
					data.requestedBy = undefined;
					data.dateRequested = undefined;
					if (member.accessLevel !== ACCESS_LEVEL_LEADER) {
						data.status = undefined;
					}
					for (let key in data) {
						item[key] = data[key];
					}
					dbs.partRequests.setItem(index, item);
					res.status(200).send(item);
				});		
			});
		} 
	});
});

//Begin testing area

//End testing area

app.get('/public/*', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/private/*', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/*', (req, res) => res.sendFile(rootDir + req.path));

// Arg 0 is node. Arg 1 is script name. This code will switch how the server runs depending on whether or not arg2 is 'prod' (production mode)
if (productionMode) {
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