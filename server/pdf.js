const fs = require('fs');
const pdfFiller = require('pdffiller');

module.exports.createAndSendPurchaseForm = function(vendor, partRequests, res) {
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
		var dest = '/tmp/out.pdf';
		pdfFiller.fillForm(source, dest, data, (err) => {
			if(err) throw err;
			res.setHeader('Content-disposition', 'attachment; filename=Purchase Request Form.pdf');
			res.setHeader('Content-type', 'application/pdf');
			res.status(200).sendFile('/tmp/out.pdf');
		});
	} else {
		fs.writeFile('/tmp/out.txt', 'This is test text!', (err) => {
			if(err) throw err;
			res.setHeader('Content-disposition', 'attachment; filename=Purchase Request Form.txt');
			res.setHeader('Content-type', 'application/octet-stream');
			res.status(200).send(JSON.stringify(data));
		});
	}
}