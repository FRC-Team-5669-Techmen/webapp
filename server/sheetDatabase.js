const google = require('./google');
const sheets = google.gapis.sheets('v4');

const chars = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
base26 = function(base10) {
	let out = '';
	base10 *= 27;
	while(true) {
		let digit = Math.floor(base10 / 26);
		if(digit == 0) {
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
		this.getColumns();
	}
	
	_apiCall(func, data, callback) {
		data.auth = google.jwtClient;
		data.spreadsheetId = this.sheetId;
		func(data, (err, res) => {
			if(err) {
				console.error('Error in SheetDatabase API call: ' + err);
			} else {
				callback(res);
			}
		})
	}
	
	getColumns(callback) {
		this._apiCall(sheets.spreadsheets.values.get, {range: '1:1'}, (res) => {
			this.colTitles = res.values[0];
			this.colLabels = [];
			for(let title of this.colTitles) {
				// Human readable to CONSTANT_CASE
				this.colLabels.push(title.toUpperCase().replace(' ', '_').replace(/[^A-Z0-9_]/, ''));
			}
			this.jsNames = [];
			for(let label of this.colLabels) {
				// CONSTANT_CASE to camelCase.
				this.jsNames.push(label.toLowerCase().replace(/_([a-z])/, (match, p1) => p1.toUpperCase()));
			}
		});
	}
	
	getItems(startIndex, stopIndex, callback) {
		startIndex += 2; // Header is row 1, element 0 would be at row 2.
		stopIndex += 2;
		this._apiCall(sheets.spreadsheets.values.get, {range: startIndex + ':' + stopIndex}, (res) => {
			let items = []
			for(let row of res.values) {
				let item = {}
				for(let i = 0; i < row.length; i++) {
					let field = row[i];
					// Special cases
					if (field == 'TRUE') {
						field = true;
					} else if (field == 'FALSE') {
						field = false;
					}
					item[this.jsNames[i]] = field;
				}
				items.push(item);
			}
			callback(items);
		})		
	}
	
	getItem(index, callback) {
		this.getItems(index, index, (data) => callback(data[0]));
	}
	
	get(index, key, callback) {
		let column = this.jsNames.indexOf(key);
		if(column == -1) column = this.colLabels.indexOf(key);
		let cell = base26(column + 1) + (index + 2);
		this._apiCall(sheets.spreadsheets.values.get, {range: cell + ':' + cell}, (res) => {
			callback(res.values[0][0]);
		})
	}
	
	getSize(callback) {
		this._apiCall(sheets.spreadsheets.values.get, {range: 'A:A'}, (res) => {
			callback(res.values.length - 1); // -1 for header.
		});
	}
	
	setItems(startIndex, items) {
		startIndex += 2;
		let endIndex = startIndex + items.length - 1;
		let arrayed = [];
		for(let item of items) {
			let arrayedItem = [];
			for(let key of this.jsNames) {
				arrayedItem.push(item[key]);
			}
			arrayed.push(arrayedItem);
		}
		let data = {
				range: startIndex + ':' + endIndex,
				valueInputOption: 'RAW',
				resource: {
					values: arrayed
				}
		}
		this._apiCall(sheets.spreadsheets.values.update, data, (res) => null);
	}
	
	setItem(index, item) {
		this.setItems(index, [item]);
	}
	
	set(index, key, value) {
		let column = this.jsNames.indexOf(key);
		if(column == -1) column = this.colLabels.indexOf(key);
		let cell = base26(column + 1) + (index + 2);
		let data = {
				range: cell + ':' + cell,
				valueInputOption: 'RAW',
				resource: {
					values: [[value]]
				}
		};
		this._apiCall(sheets.spreadsheets.values.update, data, (res) => null);
	}
	
	push(item) {
		this.getSize((size) => {
			this.setItem(size, item);
		})
	}
	
	getAllValues(key, callback) {
		let column = this.jsNames.indexOf(key);
		if(column == -1) column = this.colLabels.indexOf(key);
		column = base26(column + 1);
		this._apiCall(sheets.spreadsheets.values.get, {range: column + ':' + column}, (res) => {
			let output = [];
			for (let row of res.values.slice(1)) {
				output.push(row[0]);
			}
			callback(output);
		});
	}
}

module.exports.SheetDatabase = SheetDatabase;
module.exports.base26 = base26;
