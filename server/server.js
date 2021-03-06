global.productionMode = process.argv.indexOf('--prod') !== -1;
global.authDisabled = process.argv.indexOf('--noauth') !== -1;
if (global.productionMode && global.authDisabled) {
	throw new Error('Cannot have authorization disabled in production mode.')
}
global.forceHttp = process.argv.indexOf('--force-http') !== -1;
global.redirectHttp = process.argv.indexOf('--no-reroute-http') === -1 && !global.forceHttp;
global.port = global.productionMode ? (global.forceHttp ? 80 : 443) : 4200;
if (!global.productionMode && ! global.useHttp) {
	throw new Error('HTTP Rerouting can only be disabled in production mode.');
}
if (process.argv.indexOf('--port') !== -1) {
	const portIndex = process.argv.indexOf('--port') + 1;
	if (portIndex >= process.argv.length) {
		throw new Error('--port must be followed by a port number to serve on.');
	}
	const port = process.argv[portIndex];
	const portNum = Number(port);
	if (!(portNum >= 0 && portNum <= 65535)) {
		throw new Error('--port must be followed by a valid port number, not ' + a + '.');
	}
	global.port = portNum;
}

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
const sessionStorage = require('./sessionStorage');
const rawDiscord = require('./rawDiscord');
const DiscordBot = require('./discordBot');

const rootDir = path.resolve(__dirname + '/../dist'); // ../ causes problems, because it is susceptible to exploitation.

var app = express();
app.use(compression());
app.use(bodyParser.json({type:"*/*"}));
app.use(bodyParser.urlencoded({
	extended: true
}));

let requestLogger = function (req, res, next) {
	console.log(req.ip || req.ips, req.method, req.path);
	if (req.body && Object.keys(req.body).length != 0) console.log('body:', req.body);
	next();
}
app.use(requestLogger);

// API code.
const ACCESS_LEVEL_VISITOR = 'visitor', ACCESS_LEVEL_RESTRICTED = 'restricted', ACCESS_LEVEL_MEMBER = 'member' 
	ACCESS_LEVEL_LEADER = 'leader';

// Callback is passed the contents of the token in the authorization header of req if successful, null if not, and
// undefined if header is not present.
function validateSession(req, callback) {
	const authorization = req.get('authorization') || req.query.sessionToken;
	if (!authorization) {
		callback(undefined);
		return;
	}
	const split = authorization.split(' ');
	let method, token;
	if (split.length === 1) {
		token = split[0];
	} else {
		method = split[0];
		token = split[1];
	}
	if (sessionStorage.sessionExists(token)) {
		callback(sessionStorage.getSessionByToken(token));
	} else {
		callback(null);
	}
}

// Next is a (member?: Member) => void function called when it is determined the user meets access requirements.
// member is only passed to next if access level is greater than ACCESS_LEVEL_VISITOR.
function checkLogin(req, res, accessLevel, next) {
	if (accessLevel == ACCESS_LEVEL_VISITOR) {
		next();
		return;
	}
	validateSession(req, (session) => {
		if (!session || !session.memberId) {
			res.status(401).send({error: 'A valid session token representing a session with an associated logged in user must be sent in the Authorization header. Either the token was not present, or the session associated with the token does not represent a logged in user.'});
			return;			
		}
		dbs.members.findItemWithValue('id', session.memberId, (item) => {
			if (!item) { // User is not registered.
				res.status(403).send({error: 'The currently logged in user has not completed registration.'});
				return;
			}
			// If leadership / membership not required, don't check those.
			if (accessLevel == ACCESS_LEVEL_RESTRICTED) {
				next(item);
				return;
			}
			if (item.accessLevel == ACCESS_LEVEL_LEADER) { // Leaders can access anything, no matter what.
				next(item);
			} else if ((item.accessLevel == ACCESS_LEVEL_MEMBER) && (accessLevel == ACCESS_LEVEL_MEMBER)) {
				// Members can access member-level and below stuff. (Below stuff handled earlier.)
				next(item);
			} else {
				if (accessLevel == ACCESS_LEVEL_LEADER) {
					res.status(403).send({error: 'This action requires the current user to be a leader.'});
				} else {
					res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by a leader, which has not happened.'});
				}
			}
		});
	});
}

function getAuthHost(req) {
	return `http${productionMode ? 's' : ''}://${req.headers.host}`;
}

app.get('/api/v1/accessLevel', (req, res) => {
	validateSession(req, (session) => {
		if (!session || !session.memberId) {
			res.status(201).send({accessLevel: ACCESS_LEVEL_VISITOR});
			return;
		}
		dbs.members.findItemWithValue('id', session.memberId, (item) => {
			if (!item) { // Not registered.
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
	validateSession(req, (session) => {
		if (!session || !session.memberId) {
			res.status(401).send({error: 'A valid session token representing a session with an associated logged in user must be sent in the Authorization header. Either the token was not present, or the session associated with the token does not represent a logged in user.'});		
		}
		dbs.members.findItemWithValue('id', session.memberId, (member) => {				
			// Only copy data that can be set by a user. This is to prevent the user trying to modify things they normally could not.
			member.firstName = data.firstName;
			member.lastName = data.lastName;
			member.shirtSize = data.shirtSize;
			member.emailAddress = data.emailAddress;
			member.sendEmails = data.sendEmails;
			member.phone = data.phone;
			member.gradeLevel = data.gradeLevel;
			member.team = data.team;
			member.experience = data.experience;
			member.parent.firstName = data.parent.firstName;
			member.parent.lastName = data.parent.lastName;
			member.parent.phone = data.parent.phone;
			member.parent.emailAddress = data.parent.emailAddress;
			session.getDiscordAuthToken(getAuthHost(req), (token) => {
				bot.setupUser(member.connections.discord.id, token, member.firstName + ' ' + member.lastName);
				bot.updateMembersDrivePermissions([member.connections.discord.id]);
			})
			res.status(201).send(member);
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
					trimmedData.push({
						firstName: member.firstName,
						lastName: member.lastName,
						id: member.id,
						gradeLevel: member.gradeLevel,
						team: member.team,
						accessLevel: member.accessLevel
					});
				}
				res.status(200).send(trimmedData);
			});
		});
	});
});

// 0 = less data, 1 = more data.
function censorMember(member, level = 0) {
	let trimmedMember = {
		firstName: member.firstName,
		lastName: member.lastName,
		id: member.id,
		gradeLevel: member.gradeLevel,
		team: member.team,
		accessLevel: member.accessLevel,
		emailAddress: member.emailAddress,
		experience: member.experience
	};
	if (level >= 1) {
		trimmedMember.phone = member.phone;
		trimmedMember.parent = member.parent;
		trimmedMember.shirtSize = member.shirtSize;
		trimmedMember.sendEmails = member.sendEmails;
	}
	return trimmedMember;
}

app.get('/api/v1/members/me', (req, res) => {
	validateSession(req, (session) => {
		if (!session) {
			res.status(400).send({error: 'A valid session token is required to check what member the session is associated with.'});
		} else {
			if (session.memberId) {
				dbs.members.findItemWithValue('id', session.memberId, (member) => {
					res.status(200).send(censorMember(member, 1));
				});
			} else {
				res.status(404).send({'error': 'There is no member associated with the current session.'});
			}
		}
	});
});

app.get('/api/v1/members/exportXls', (req, res) => {
	let data = 'Name\tEmail Address\tPhone Number\tGrade Level\tTeam\tShirt Size\tE.C. Name\tE.C. Phone\tE.C. Email\n';
	dbs.members.getAllItems((items) => {
		for (let member of items) {
			data += member.firstName + ' ' + member.lastName + '\t';
			for (let key of ['emailAddress', 'phone', 'gradeLevel', 'team', 'shirtSize']) {
				data += member[key] + '\t';
			}
			data += member.parent.firstName + ' ' + member.parent.lastName + '\t' + member.parent.phone;
			data += '\t' + member.parent.emailAddress + '\n';
		}
		res.status(200).attachment('Members.xls').type('application/vnd.ms-excel').send(data);
	});
});

app.get('/api/v1/members/:id', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_RESTRICTED, (member) => {
		let id = req.params.id;
		if ((id != member.memberId) && (member.accessLevel == ACCESS_LEVEL_RESTRICTED)) {
			res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by a leader, which has not happened.'});
		}
		dbs.members.findItemWithValue('id', id, (found) => {
			if (!found) {
				res.status(404).send({error: 'No members have that id.'});
			} else {
				let dataLevel = 0;
				if (found.id === member.id || member.accessLevel === ACCESS_LEVEL_LEADER) dataLevel = 1;
				res.status(200).send(censorMember(found, dataLevel));
			}
		});
	});	
});

app.patch('/api/v1/members/:id', (req, res) => {
	const data = req.body;
	// If the user wants to modify the access level or the team of a member, they must be a leader.
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (writer) => {
		let id = req.params.id;
		if (writer.id !== id && writer.accessLevel !== ACCESS_LEVEL_LEADER) {
			res.status(403).send({error: 'Only leaders can edit details of users other than themselves.'});
		}
		dbs.members.findItemWithValue('id', id, (member) => {
			if (!member) {
				res.status(404).send({error: 'No members have that id.'});
				return;
			}
			// Again, security stuff. We want to make sure that only writable data is copied without having to update this when new, unwritable data is added to the database.
			for (key of ['firstName', 'lastName', 'shirtSize', 'emailAddress', 'sendEmails', 'phone', 'gradeLevel', 'team', 'experience']) {
				member[key] = data[key] || member[key];
			}
			if (data.parent) {
				for (key of ['firstName', 'lastName', 'phone', 'emailAddress']) {
					member.parent[key] = data.parent[key] || member.parent[key];
				}
			}
			if (writer.accessLevel === ACCESS_LEVEL_LEADER) {
				for (key of ['accessLevel']) {
					member[key] = data[key] || member[key];
				}
			}
			bot.updateMembersDrivePermissions([member.connections.discord.id]);
			res.status(200).send(censorMember(member, 1));
			
		});
	});	
});

app.get('/api/v1/teams', (req, res) => {
	dbs.miscConfig.get('teams', (tlist) => {
		res.status(200).send(tlist);
	})
})

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
				if (item.requestedBy !== member.emailAddress) {
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
		data.requestedBy = member.id;
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
				if (ids.indexOf(requests[i].requestId) !== -1) {
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
				if (item.requestedBy !== member.id) {
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
					if ((item.requestedBy !== member.id) && (member.accessLevel !== ACCESS_LEVEL_LEADER)) {
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

app.get('/api/v1/session/new', (req, res) => {
	res.status(201).send({
		token: sessionStorage.createNewSession().token
	});
});

app.get('/api/v1/session/isValid', (req, res) => {
	validateSession(req, (session) => {
		if (session) {
			res.status(200).send({
				valid: true,
				recommendedToken: session.token
			});
		} else {
			res.status(200).send({
				valid: false,
				recommendedToken: sessionStorage.createNewSession().token
			});
		}
	});
});

let bot = new DiscordBot();

app.get('/api/v1/discord/authCallback', (req, res) => {
	let sessionToken = req.query.state, code = req.query.code;
	if (!sessionStorage.sessionExists(sessionToken)) {
		res.status(400).send({error: 'Must send a valid session token in query string.'});
		return;
	}
	rawDiscord.exchangeToken(code, (productionMode ? 'https://' : 'http://') + req.headers.host, (authData) => {
		authData.receivedOn = Date.now();
		rawDiscord.getUserData(authData.access_token, (userData) => {
			dbs.members.getAllItems((users) => {
				let fillData = (user) => {
					user.connections.discord.id = userData.id;
					user.connections.discord.refreshToken = authData.refresh_token;
					user.connections.discord.accessToken = authData.access_token;
					user.connections.discord.accessTokenExp = Date.now() / 1000 + authData.expires_in;
					user.connections.discord.avatar = userData.avatar;
					user.emailAddress = user.emailAddress || userData.email; // Only put it in if there is currently no email provided.
					sessionStorage.storeDataInSession(sessionToken, 'memberId', user.id);
				}
				let foundUser = false;
				for (let user of users) {
					if (user && user.connections && user.connections.discord && user.connections.discord.id === userData.id) {
						foundUser = true;
						fillData(user);
						break;
					}
				}
				if (!foundUser) {
					let user = dbs.members.createMember();
					fillData(user);
				}
				res.redirect('/public/register');
			});
		});
	});
});

app.get('/api/v1/discord/defaultRoles', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		dbs.miscConfig.get('discord', (dconfig) => {
			res.status(200).send(dconfig.defaultRoles);
		});
	});
});

app.patch('/api/v1/discord/defaultRoles', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		dbs.miscConfig.get('discord', (dconfig) => {
			let teamRoles = [];
			dbs.miscConfig.get('teams', (tlist) => {
				for (let team of tlist) {
					teamRoles.push(team + 'Team');
				}
				for (let key of ['restricted', 'member', 'leader', 'freshman', 'sophomore', 'junior', 'senior', 'alumnus', 'faculty', 'other'].concat(teamRoles)) {
					if (req.body[key]) {
						dconfig.defaultRoles[key] = req.body[key];
					}
				}
				bot.updateDefaultRoles();
				bot.updateMembersDrivePermissions();
				res.status(200).send(dconfig.defaultRoles);
			})
		});
	});
});

app.get('/api/v1/discord/roles', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_MEMBER, (member) => {
		let roles = bot.getAllRoles();
		// Unify role data and roleExtra data for the end user. They should be treated as a single piece of data.
		dbs.roleExtras.getAllItems((roleExtras) => {
			for (let role of roles) {
				role.googleDriveAccess = [];
				role.minimumAccessLevel = ACCESS_LEVEL_RESTRICTED;
				for (let extra of roleExtras) {
					if (extra.discordId === role.id) {
						role.googleDriveAccess = extra.googleDriveAccess;
						role.minimumAccessLevel = extra.minimumAccessLevel;
						break;
					}
				}
			}
			res.status(200).send(roles);
		});
	});
});

app.get('/api/v1/discord/roles/:discordId', (req, res) => {
	bot.getMembersWithRole(req.params.discordId).then(console.log);
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		dbs.roleExtras.findItemWithValue('discordId', req.params.discordId, (result) => {
			let roles = bot.getAllRoles();
			for (let role of roles) {
				if (role.id === req.params.discordId) {
					role.googleDriveAccess = result.googleDriveAccess;
					role.minimumAccessLevel = result.minimumAccessLevel;
					res.status(200).send(role);
					return;
				}
			}
			res.sendStatus(404);
		});
	});
});

app.patch('/api/v1/discord/roles/:discordId', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		dbs.roleExtras.findItemWithValue('discordId', req.params.discordId, (result) => {
			if (typeof(req.body.googleDriveAccess) === typeof([])) {
				result.googleDriveAccess = req.body.googleDriveAccess;
				bot.getMembersWithRole(req.params.discordId).then((members) => {
					bot.updateMembersDrivePermissions(members.map(x => x.connections && x.connections.discord.id));
				});
			}
			if (typeof(req.body.minimumAccessLevel) == typeof('')) {
				result.minimumAccessLevel = req.body.minimumAccessLevel;
			}
			res.status(200).send(result);
		});
	});
});

app.get('/api/v1/drives', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_LEADER, (member) => {
		drive.getDrives().then((drives) => {
			let tr = [];
			for (let drive of drives) {
				tr.push({
					id: drive.id,
					name: drive.name
				});
			}
			res.status(200).send(tr);
		});
	});
});

//Begin testing area
//End testing area

app.get('/public/*', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/private/*', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/*', (req, res) => res.sendFile(rootDir + req.path));

if (authDisabled) {
	console.log('WARNING: ALL AUTHORIZATION CHECKS ARE DISABLED.');
}
if (productionMode) {
	// Just bumps the user to HTTPS. Serves no content.
	console.log('Starting in production mode.');
	if (redirectHttp) {
		var redirector = express();
		redirector.get('*', (req, res) => {
			res.redirect('https://' + req.headers.host + req.url);
		});
		redirector.listen(80);
	}
	if (forceHttp) {
		console.log('WARNING: Serving over HTTP in production mode! This should only be used in conjunction with an'
		          + 'HTTPS proxy or HTTPS Virtual Hosting server.');
		app.listen(port);
	} else {
		https.createServer({
			key: fs.readFileSync('../private/key.pem'),
			cert: fs.readFileSync('../private/cert.pem')
		}, app).listen(port);	
	}
} else {
	console.log('Starting in development mode');
	app.listen(port);
}

console.log('Initialization complete!');