const fs = require('fs');

const STALE_INTERVAL = 30000; // After 30 seconds, reload data from the file
const PUSH_DELAY = 2000; // After 2 seconds of inactivity, save contents to file.

class FileDatabase {
	constructor(fileName) {
		this.fileName = fileName;
		this.cacheOpInProgress = false;
		this.lastCacheGet = 0;
		this.lastCacheChange = 0;
		this.lastCacheFlush = 0;
		this.queuedPush = null;
		this.onCacheOpFinished = [];
		this._getFromSource(() => {
			// So that the code will know we have an up-to-date copy.
			this.lastCacheFlush = Date.now();
		});
	}
	
	_startCacheOp(callback) {
		if (this.cacheOpInProgress) {
			this.onCacheOpFinished.push(callback);
			return false; // Do not start another one.
		}
		this.cacheOpInProgress = true;
		return true;
	}
	
	_endCacheOp(callback) {
		for(let func of this.onCacheOpFinished) {
			func();
		}
		this.onCacheOpFinished = [];
		this.cacheOpInProgress = false;
		callback();
	}
	
	_getFromSource(callback) {
		if (!this._startCacheOp(callback)) return;
		this.data = [];
		fs.stat(this.fileName, (err, status) => {
			if (err) {
				// Do nothing, the file does not exist. Do, however, create an empty file in its place.
				fs.writeFile(this.fileName, '[]', (err, status) => 0);
				this._endCacheOp(callback);
			} else {
				fs.readFile(this.fileName, (err, data) => {
					this._endCacheOp(callback);
					if (err) throw err;
					this.data = JSON.parse(data);
				});
			}
		})
	}
	
	_flushToSource(callback) {
		if (!this._startCacheOp(callback)) return;
		fs.writeFile(this.fileName, JSON.stringify(this.data), (err, status) => {
			this._endCacheOp(callback);
			if (err) throw err;
			this.lastCacheFlush = Date.now();
		})
	}
	
	_queueFlush() {
		if(this.queuedPush) {
			clearTimeout(this.queuedPush);
		}
		this.queuedPush = setTimeout(() => {
			this.queuedPush = null;
			this._flushToSource(() => null);
		}, this.pushDelay);
	}
	
	_checkStaleness(callback) { // If we haven't made local changes yet, but the local copy is old, update it.
		if (Date.now() > this.lastCacheGet + STALE_INTERVAL) {
			// If the cache was modified after last updating the source
			if(this.lastCacheChange > this.lastCacheFlush) {
					// Local copy is old, but changes are in progress.
					// Later, flushChanges() should be called to update the source.
					console.warn('Local cache of database file ' + this.fileName + ' is ' + (Date.now() - this.lastCacheGet) + 'ms old but still has unflushed changes!');
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
		this._queueFlush();		
	}
	
	getAllItems(callback) {
		this._checkStaleness(() => {
			let result = [];
			for (let item of this.data) {
				result.push(Object.assign({}, item)); // Copy items to prevent overwriting cache data
			}
			callback(result);
		})
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
		for (let i = 0; i < items.length; i++) {
			this.data[i + startIndex] = items[i];
		}
		this._markDirty();
	}

	setItem(index, item) {
		this.data[index] = item;
		this._markDirty();
	}

	set(index, key, value) {
		this.data[index][key] = value;
		this._markDirty();
	}

	push(item) {
		this.data.push(item);
		this._markDirty();
	}
}

module.exports.FileDatabase = FileDatabase;