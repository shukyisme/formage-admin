'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var path = require('path');
var url_join = exports.testable_url_join = function () { return path.join.apply(path, arguments).replace(/\\/g, '/'); };

exports.registerPaths = function (admin, app, root) {
    root = root || '/';
    app.get(root, admin.index);
    app.get(url_join(root, '/login'), admin.login);
    app.get(url_join(root, '/logout'), admin.logout);
    app.get(url_join(root, '/model/:modelName'), admin.model);
    app.get(url_join(root, '/model/:modelName/document/:documentId'), admin.document);
    app.post(url_join(root, '/model/:modelName/document/:documentId'), admin.documentPost);
    app.post(url_join(root, '/json/login'), admin.loginPost);
    app.post(url_join(root, '/json/dependencies'), admin.checkDependencies);
    app.post(url_join(root, '/json/model/:collectionName/order'), admin.orderDocuments);
    app.post(url_join(root, '/json/model/:modelName/action/:actionId'), admin.actionDocuments);
    app.delete(url_join(root, '/json/model/:collectionName/document'), admin.deleteDocument);
};
