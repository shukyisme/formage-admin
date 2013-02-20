'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var async = require('async')
    , _ = require('underscore');


var permodel_permission = ['view', 'delete', 'create', 'update', 'order'];

var permissions_by_name = {};

module.exports.registerModel = function (modelName, permissions, callback) {
    _.once(function () {
        var mongoose = module.parent.mongoose;
        var Schema = new mongoose.Schema({
            name: {type: String, required: true}
        });
        Schema.methods.toString = function () {return this.name;};
        module.exports.model = mongoose.model('_MongooseAdminPermission', Schema);
    });
    if (typeof(permissions) === 'function' || typeof(permissions) === 'undefined') {
        callback = permissions;
        permissions = permodel_permission;
    }
    async.forEach(permissions, function (action, callback) {
        module.exports.model.update(
            {name: modelName + '_' + action},
            {$set: {name: modelName + '_' + action}},
            {upsert: true},
            function (err) {
                if (err) return callback(err);
                module.exports.model.findOne({name: modelName + '_' + action}, function (err, doc) {
                    if (doc) {
                        permissions_by_name[doc.name] = doc.id;
                    }
                    callback(err);
                });
                return null;
            }
        );
    }, callback || function () {});
};

module.exports.getPermission = function (modelName, action) {
    return permissions_by_name[modelName + '_' + action];
};

module.exports.hasPermissions = function (user, modelName, action) {
    user = user.fields || user;
    return user.is_superuser || ~_.indexOf(user.permissions, module.exports.getPermission(modelName, action));
};
