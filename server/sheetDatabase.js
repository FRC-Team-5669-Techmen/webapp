const google = require('./google');
const sheets = google.gapis.sheets('v4');

const chars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
base26 = function(base10) {
	let out = '';
	base10 *= 27;
	while (true) {
		let digit = Math.floor(base10 / 26);
		if (digit == 0) {
			return out || 'A'; // 'A' == 0, the number was empty.
		} else {
			out = chars[digit % 27] + out;
		}
		base10 = digit;
	}
}

class SheetDatabase {
	constructor(sheetId) {
		this.sheetId = sheetId;
		this.cacheOpInProgress = true; // Preset it until we are ready to actually do the first cache op.
		this.lastCacheGet = 0;
		this.lastCacheChange = 0;
		this.lastCacheFlush = 0;
		this.staleInterval = 5000; // After 5 seconds, get a new copy.
		this.pushDelay = 2000; // After 2 seconds of inactivity, push changes to google sheets.
		this.queuedPush = null;
		this.onCacheOpFinished = [];
		this._getColumns(() => {
			this.cacheOpInProgress = false;
			this._getFromSource(() => {
				// So that the code will know we have an up-to-date copy.
				this.lastCacheFlush = Date.now();
			});
		});
	}

	_apiCall(func, data, callback) {
		data.auth = google.jwtClient;
		data.spreadsheetId = this.sheetId;
		func(data, (err, res) => {
			if (err) {
				console.error('Error in SheetDatabase API call: ' + err);
			} else {
				callback(res);
			}
		})
	}
	
	_getFromSource(callback) {
		// Don't get the spreadsheet a bunch of times at once.
		if(this.cacheOpInProgress) {
			this.onCacheOpFinished.push(callback);
			return;
		}
		this.cacheOpInProgress = true;
		this._apiCall(sheets.spreadsheets.values.get, {
			range: 'A:' + base26(this.colLabels.length)
		}, (res) => {
			this.data = [];
			let values = res.values.slice(1);
			// Put values of each row into named fields of individual objects, thus creating a more easily used data structure.
			for (let row of values) {
				let item = {};
				for (let i = 0; i < this.jsNames.length; i++) {
					// To handle special cases
					if(this.colTitles[i].search(/\$/) !== -1) { // $ means interpret as string, no matter what.
						item[this.jsNames[i]] = row[i];	
					} else if (row[i] == 'TRUE') {
						item[this.jsNames[i]] = true;
					} else if (row[i] == 'FALSE') {
						item[this.jsNames[i]] = false;	
					} else if (!isNaN(row[i])) { // If it can be expressed as a number...
						item[this.jsNames[i]] = Number(row[i]);
					} else {
						item[this.jsNames[i]] = row[i];						
					}
				}
				this.data.push(item);
			}
			this.lastCacheGet = Date.now();
			callback();
			this.cacheOpInProgress = false;
			for(let func of this.onCacheOpFinished) {
				func();
			}
		});
	}
	
	_flushToSource(callback) {
		// Don't flush the spreadsheet a bunch of times at once.
		if(this.cacheOpInProgress) {
			this.onCacheOpFinished.push(callback);
			return;
		}
		this.cacheOpInProgress = true;
		let arrayed = [];
		for (let item of this.data) {
			let arrayedItem = [];
			for (let key of this.jsNames) {
				arrayedItem.push(item[key]);
			}
			arrayed.push(arrayedItem);
		}
		this._apiCall(sheets.spreadsheets.values.update, {
			range: 'A2:' + base26(this.colLabels.length) + (this.data.length + 1),
			valueInputOption: 'RAW',
			resource: {
				values: arrayed
			}
		}, () => {
			this.lastCacheFlush = Date.now();
			callback();
		});
		this.cacheOpInProgress = false;
		for(let func of this.onCacheOpFinished) {
			func();
		}
	}
	
	_queuePush() {
		if(this.queuedPush) {
			clearTimeout(this.queuedPush);
		}
		this.queuedPush = setTimeout(() => {
			this.queuedPush = null;
			this._flushToSource(() => null);
		}, this.pushDelay);
	}

	_getColumns(callback) {
		this._apiCall(sheets.spreadsheets.values.get, {
			range : '1:1'
		}, (res) => {
			this.colTitles = res.values[0];
			this.colLabels = [];
			for (let title of this.colTitles) {
				// Human readable to CONSTANT_CASE
				this.colLabels.push(title.toUpperCase().replace(' ', '_').replace(/[^A-Z0-9_]/, '')); 
			}
			this.jsNames = [];
			for (let label of this.colLabels) {
				// CONSTANT_CASE to camelCase.
				this.jsNames.push(label.toLowerCase().replace(/_([a-z])/, (match, p1) => p1.toUpperCase())); 
			}
			callback();
		});
	}
	
	_checkStaleness(callback) { // If we haven't made local changes yet, but the local copy is old, update it.
		if(Date.now() > this.lastCacheGet + this.staleInterval) {
			// If the cache was modified after last updating the source
			if(this.lastCacheChange > this.lastCacheFlush) {
				// Local copy is old, but changes are in progress.
				// Later, flushChanges() should be called to update the source.
				console.warn("Local cache of spreadsheet " + this.sheetId + " is " + (Date.now() - this.lastCacheGet) + "ms old but still has unflushed changes!");
				callback();
			} else {
				// Grab a more recent copy
				this._getFromSource(callback);
			}
		} else {
			callback(); // Local copy is new.
		}
	}
	
	_markDirty() {
		this.lastCacheChange = Date.now();
		this._queuePush();		
	}

	getItems(startIndex, stopIndex, callback) {
		this._checkStaleness(() => {
			let result = [];
			for (let item of this.data.slice(startIndex, stopIndex)) {
				result.push(Object.assign({}, item)); // Copy items to prevent overwriting cache data
			}
			callback(result);
		});
	}

	getItem(index, callback) {
		this._checkStaleness(() => {
			callback(Object.assign({}, this.data[index])); // Copy items to prevent overwriting cache data
		});
	}

	get(index, key, callback) {
		this._checkStaleness(() => {
			callback(this.data[index][key]);
		});
	}

	getAllValues(key, callback) {
		this._checkStaleness(() => {
			let values = [];
			for (let item of this.data) {
				values.push(item[key]);
			}
			callback(values);
		});
	}

	getSize(callback) {
		this._checkStaleness(() => {
			callback(this.data.length);
		});
	}

	findItemWithValue(key, value, callback) {
		this._checkStaleness(() => {
			for (let item of this.data) {
				if(item[key] === value) {
					callback(Object.assign({}, item)); // Copy items to prevent overwriting cache data
					return;
				}
			}
			callback(undefined);
		});
	}

	setItems(startIndex, items) {
		this._checkStaleness(() => {
			for (let i = 0; i < items.length; i++) {
				this.data[i + startIndex] = items[i];
			}
			this._markDirty();
		});
	}

	setItem(index, item) {
		this._checkStaleness(() => {
			this.data[index] = item;
			this._markDirty();
		});
	}

	set(index, key, value) {
		this._checkStaleness(() => {
			this.data[index][key] = value;
			this._markDirty();
		});
	}

	push(item) {
		this._checkStaleness(() => {
			this.data.push(item);
			this._markDirty();
		});		
	}
}

module.exports.SheetDatabase = SheetDatabase;
module.exports.base26 = base26;