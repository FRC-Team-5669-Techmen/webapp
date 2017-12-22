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
const port = 25565;

// Begin testing area

// End testing area

var app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.listen(port, function() {});
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));

// API code.
const ACCESS_LEVEL_VISITOR = 'visitor', ACCESS_LEVEL_RESTRICTED = 'restricted', ACCESS_LEVEL_MEMBER = 'member' 
	ACCESS_LEVEL_ADMIN = 'admin';

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
			if(item == null) { // User is not registered.
				res.status(403).send({error: 'This action requires that the user have signed up, which they have not done.'});
				return
			}
			// If admin / membership not required, don't check those.
			if(accessLevel == ACCESS_LEVEL_RESTRICTED) {
				next(item);
				return;
			}
			if(item.accessLevel == ACCESS_LEVEL_ADMIN) { // Admins can access anything, no matter what.
				next(item);
			} else if((item.accessLevel == ACCESS_LEVEL_MEMBER) && (accessLevel == ACCESS_LEVEL_MEMBER)) {
				// Members can access member-level and below stuff. (Below stuff handled earlier.)
				next(item);
			} else {
				if(accessLevel == ACCESS_LEVEL_ADMIN) {
					res.status(403).send({error: 'This action requires admin access, which the current user does not have.'});
				} else {
					res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by an admin, which has not happened.'});
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
	validateAuthorizatoin(req, (content) => {
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
			// This could be set to ACCESS_LEVEL_ADMIN by a 1337 hacker trying to get access, so make sure it is set to RESTRICTED.
			data.accessLevel = ACCESS_LEVEL_RESTRICTED;
			dbs.members.push(data);
			dbs.members.getSize((size) => {
				dbs.members.getItem(size - 1, (item) => {
					res.status(201).send(item);
				});
			});
		});
	});
});

app.get('/api/v1/members/:email', (req, res) => {
	checkLogin(req, res, ACCESS_LEVEL_RESTRICTED, (member) => {
		let address = req.params.email;
		if((address != member.emailAddress) && (member.accessLevel == ACCESS_LEVEL_RESTRICTED)) {
			res.status(403).send({error: 'This action requires the user\'s membership to be confirmed by an admin, which has not happened.'});
		}
		dbs.members.getAllValues('emailAddress', (values) => {
			let index = values.indexOf(address);
			if (index == -1) {
				res.status(404).send({error: 'No members have that email address.'});
			} else {
				dbs.members.getItem(index, (data) => {
					res.status(200).send(data);
				});
			}
		});
	});	
});

app.patch('/api/v1/members/:email', (req, res) => {
	const data = req.body;
	// If the user wants to modify the access level of a member, they must be an admin.
	checkLogin(req, res, (data.accessLevel) ? ACCESS_LEVEL_ADMIN : ACCESS_LEVEL_MEMBER, (member) => {
		let address = req.params.email;
		if((member.emailAddress !== address) && (member.accessLevel != ACCESS_LEVEL_ADMIN)) {
			res.status(403).send({error: 'Only admins can edit details of users other than themselves.'});
		}
		dbs.members.getAllValues('emailAddress', (values) => {
			let index = values.indexOf(address);
			if (index == -1) {
				res.status(404).send({error: 'No members have that email address.'});
			} else {
				dbs.members.getItem(index, (item) => {
					for(let key in data) {
						if((key != 'auth') && (key != 'emailAddress')) {
							item[key] = data[key];
						}
					}
					dbs.members.setItem(index, item)
					res.status(200).send(item);
				});
			}
		});
	});	
});

app.get('/*.*', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*', (req, res) => res.sendFile(rootDir + '/index.html'));

console.log('Initialization complete!');