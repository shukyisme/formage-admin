'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var path = require('path');
var FormageAdmin = require('./admin.js').FormageAdmin;
module.exports.version = '1.0.1';
var formage = module.exports.formage = require('formage');
module.exports.crypt = require('./crypt');
module.exports.AdminForm = require('./form').AdminForm;


module.exports.loadApi = require('./form').loadApi;
module.exports.statics_path = path.join(__dirname, 'public');
module.exports.serve_static = function (app, express) {
    if (module._serving_statics) return;
    module._serving_statics = true;

    formage.serve_static(app, express);
    app.use('/', express.static(module.exports.statics_path));
};


module.exports.load_types = function (mongoose) {
    if (this._types_loeaded) return;
    this._types_loeaded = true;

    module.exports.mongoose_module = module.exports.mongoose_module || mongoose;
    module.mongoose_module = module.exports.mongoose_module;
    module.exports.formage.load_types(mongoose);
};


module.exports.register_models = function (models) {
    if (this._models_registered) return;
    this._models_registered = true;

    module.exports.models = models;
    module.exports.formage.register_models(models);
};


module.exports.set_amazon_credentials = module.exports.formage.set_amazon_credentials;


module.exports.createAdmin = function (app, options, mongoose) {
    return new FormageAdmin(app, options, mongoose);
};


// Deprecated
module.exports.forms = module.exports.formage;
