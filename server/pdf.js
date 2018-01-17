const { exec } = require('child_process');
const fs = require('fs');
const pdfFiller = require('pdffiller');

function createFormPage(vendor, partRequests, filename) {
	let data = {};
	
	data.vendor_name = vendor.vendorName;
	data.vendor_address = vendor.address;
	data.vendor_city = vendor.city;
	data.vendor_state = vendor.state;
	data.vendor_zip = vendor.zip;
	data.vendor_phone = vendor.phone;
	data.vendor_email = vendor.email;
	data.vendor_tin = vendor.tin;
	
	let subtotal = 0;
	for (let index = 0; index < partRequests.length; index++) {
		data['item_name_' + (index + 1)] = partRequests[index].itemDescription;
		data['item_number_' + (index + 1)] = partRequests[index].itemNumber;
		const price = partRequests[index].price, quantity = partRequests[index].quantity;
		data['item_price_' + (index + 1)] = price.toFixed(2);
		data['item_quantity_' + (index + 1)] = quantity.toFixed(0);
		data['item_total_price_' + (index + 1)] = (price * quantity).toFixed(2);
		subtotal += price * quantity;
		data['item_tax_exempt_' + (index + 1)] = 'No';
	}
	data.subtotal = subtotal.toFixed(2);
	
	if(data.item_tax_exempt_10) {
		data.item_tax_exempt_5_2 = data.item_tax_exempt_10; // Typo in the PDF file -_-
	}
	
	if(productionMode) { // I do not have admin rights on the development computer to be able to install a required package.
		var source = './fillablePurchaseRequestForm.pdf';
		var dest = '/tmp/' + filename + '.pdf';
		return new Promise((resolve, reject) => {
			pdfFiller.fillForm(source, dest, data, (err) => {
				if(err) {
					reject(err);
				} else {
					resolve(dest);
				}
			});
		});
	} else {
		let dest = '/tmp/' + filename + '.txt';
		return new Promise((resolve, reject) => {
			fs.writeFile(dest, JSON.stringify(data), (err) => {
				if(err) {
					reject(err);
				} else {
					resolve(dest);
				}
			});
		});
	}	
}

module.exports.createAndSendPurchaseForm = function(vendorList, partRequests, res) {
	// Group requests into individual vendors.
	let buckets = {};
	for(let request of partRequests) {
		if(!buckets[request.vendorName]) {
			buckets[request.vendorName] = [request];
		} else {
			buckets[request.vendorName].push(request);
		}
	}
	
	// Group each bucket into pages of 10 requests each.
	let pages = [];
	for(let vendor in buckets) {
		for(let i = 0; i < buckets[vendor].length; i += 10) {
			pages.push({
				vendor: vendor, 
				requests: buckets[vendor].slice(i, Math.min(i + 10, buckets[vendor].length)),
				uuid: Math.random().toFixed(10).toString().slice(2)
			});
		}
	}
	
	let promises = [];
	for(let page of pages) {
		promises.push(createFormPage(vendorList.find((e) => e.vendorName === page.vendor), page.requests, page.uuid));
	}
	
	Promise.all(promises).then((filenames) => {
		if(productionMode) {
			res.setHeader('Content-disposition', 'attachment; filename=Part Request Form.pdf');
			res.setHeader('Content-type', 'application/pdf');
			exec('pdftk ' + filenames.join(' ') + ' cat output /tmp/out.pdf', () => {
				res.status(200).sendFile('/tmp/out.pdf');
			});
		} else {
			res.setHeader('Content-disposition', 'attachment; filename=Part Request Form.txt');
			res.setHeader('Content-type', 'text/plain');
			exec('cat ' + filenames.join(' ') + ' > /tmp/out.txt', () => {
				res.status(200).sendFile('/tmp/out.txt');
			});
		}
		/*
		 * 
				res.setHeader('Content-disposition', 'attachment; filename=Purchase Request Form.pdf');
				res.setHeader('Content-type', 'application/pdf');
				res.status(200).sendFile('/tmp/out.pdf');
		 */
		
	});
}