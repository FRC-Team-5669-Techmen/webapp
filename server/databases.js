const FileDatabase = require('./fileDatabase').FileDatabase;

module.exports.members = new FileDatabase('../private/members.json');
module.exports.partVendors = new FileDatabase('../private/partVendors.json');
module.exports.partRequests = new FileDatabase('../private/partRequests.json');