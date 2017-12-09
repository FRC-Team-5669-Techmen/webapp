const path = require('path');
//Express framework stuff
const bodyParser = require('body-parser');
const compression = require('compression');
const express = require('express');

const rootDir = path.resolve(__dirname + '/../dist'); // ../ causes problems, because it is susceptible to exploitation.
const port = 25565;

var app = express();
app.use(compression()).use(bodyParser.json()).listen(port, function() {});
app.get('/', (req, res) => res.sendFile(rootDir + '/index.html'));
app.get('/api/v*/*', (req, res) => console.log(req.path));
app.get('/*.*', (req, res) => res.sendFile(rootDir + req.path));
app.get('/*', (req, res) => res.sendFile(rootDir + '/index.html'));

console.log('Initialization complete!');