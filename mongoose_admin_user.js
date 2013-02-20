'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var bcrypt = require('./crypt');
exports.bcrypt = bcrypt;

var AdminUserData = new module.parent.mongoose_module.Schema({
    username:{type:String, required:true, unique:true},
    passwordHash:{type:String, editable:false},
    is_superuser :{type:Boolean,'default':false},
    permissions: [
        {type: module.parent.mongoose_module.Schema.ObjectId, ref: '_MongooseAdminPermission'}
    ]
}, {strict: true});

module.parent.mongoose_module.model('_MongooseAdminUser', AdminUserData);

function MongooseAdminUser() {
    this.fields = {};
}




MongooseAdminUser.prototype.toSessionStore = function () {
    var serialized = {};
    for (var i in this) {
        if (!this.hasOwnProperty(i))
            continue;
        if (typeof i !== 'function' || typeof i !== 'object') {
            serialized[i] = this[i];
        }
    }

    return JSON.stringify(serialized);
};



MongooseAdminUser.fromSessionStore = function (sessionStore) {
    var sessionObject = JSON.parse(sessionStore);
    var adminUser = new MongooseAdminUser();
    for (var i in sessionObject) {
        if (sessionObject.hasOwnProperty(i)) {
            adminUser[i] = sessionObject[i];
        }
    }

    return adminUser;
};



MongooseAdminUser.ensureExists = function (username, password, onReady) {
    var adminUser = new MongooseAdminUser();
    var adminUserModel = module.parent.mongoose.model('_MongooseAdminUser');

    adminUserModel.findOne({'username': username}, function(err, adminUserData) {
        if (err) {
            console.log('Unable to check if admin user exists because: ' + err);
        } else {
            var salt = bcrypt.gen_salt_sync(10);
            if (adminUserData) {
                adminUserData.passwordHash = bcrypt.encrypt_sync(password, salt);
            } else {
                adminUserData = new AdminUserModel();
                adminUserData.username = username;
                adminUserData.passwordHash = bcrypt.encrypt_sync(password, salt);
            }
            adminUserData.is_superuser = true;
            adminUserData.save(function (err) {
                if (err) {
                    console.log('Unable to create or update admin user because: ' + err);
                    onReady('Unable to create or update admin user', null);
                } else {
                    adminUser.fields = adminUserData;
                    onReady(null, adminUser);
                }
            });
        }
    });
};



MongooseAdminUser.getByUsernamePassword = function (username, password, onReady) {
    var adminUser = new MongooseAdminUser();
    var adminUserModel = module.parent.mongoose.model('_MongooseAdminUser');

    adminUserModel.findOne({'username': username}, function (err, adminUserData) {
        if (err) {
            console.log('Unable to get admin user because: ' + err);
            onReady('Unable to get admin user', null);
        } else {
            if (adminUserData) {
                if (bcrypt.compare_sync(password, adminUserData.passwordHash)) {
                    adminUser.fields = adminUserData;
                    onReady(null, adminUser);
                } else {
                    onReady(null, null);
                }
            } else {
                onReady(null, null);
            }
        }
    });
};
