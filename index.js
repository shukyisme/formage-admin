'use strict';
if (!module.parent) { console.log('Please don\'t call me directly. I am just the main app\'s minion.'); process.exit(1); }

var path = require('path');

exports.common = require('./common');
exports.types = require('./mongoose-types');
exports.forms = require('./forms');
exports.fields = require('./fields');
exports.widgets = require('./widgets');

exports.statics_path = path.join(__dirname, 'public');
exports.mongoose_module = {};
exports.models = {};

exports.setAmazonCredentials = exports.fields.setAmazonCredentials;


exports.serve_static = function(app, express) {
    app.use('/', express.static(exports.statics_path));
};

exports.loadTypes = function (mongoose) {
    exports.mongoose_module = exports.mongoose_module || mongoose;
    exports.types.loadTypes(mongoose);
};

exports.register_models = function (models) {
    exports.models = models;
    exports.forms.set_models(models);
};
