const path = require('path');
//Express framework stuff
const bodyParser = require('body-parser');
const compression = require('compression');
const express = require('express');

const google = require('./google');
const sd = require('./sheetDatabase');
const dbs = require('./databases');

const rootDir = path.resolve(__dirname + '/../dist'); // ../ causes problems, because it is susceptible to exploitation.
const port = 25565;

var app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.listen(port, function() {});
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));

// API code.
// app.get('/api/v*/*', (req, res) => console.log(req.path));
app.post('/api/v1/registerMember', (req, res) => {
	let data = req.body;
	dbs.members.getAllValues('emailAddress', (values) => {
		if(values.indexOf(data.emailAddress) != -1) {
			res.status(400).send({error: 'A member with that email address already exists.'});
			return;
		}
		dbs.members.push(data);
		dbs.members.getSize((size) => {
			dbs.members.getItem(size - 1, (item) => {
				res.status(201).send(item);
			})
		})
	});
})

app.get('/*.*', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*', (req, res) => res.sendFile(rootDir + '/index.html'));

console.log('Initialization complete!');