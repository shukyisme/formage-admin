'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var path = require('path');
var url_join = exports.testable_url_join = function () { return path.join.apply(path, arguments).replace(/\\/g, '/'); };

exports.registerPaths = function (admin, app, root) {
    root = root || '/';
    app.get(root, admin.index.bind(admin));
    app.get(url_join(root, '/login'), admin.login.bind(admin));
    app.get(url_join(root, '/logout'), admin.logout.bind(admin));
    app.get(url_join(root, '/model/:modelName'), admin.model.bind(admin));
    app.get(url_join(root, '/model/:modelName/document/:documentId'), admin.document.bind(admin));
    app.post(url_join(root, '/model/:modelName/document/:documentId'), admin.documentPost.bind(admin));
    app.post(url_join(root, '/json/login'), admin.loginPost.bind(admin));
    app.post(url_join(root, '/json/dependencies'), admin.checkDependencies.bind(admin));
    app.post(url_join(root, '/json/model/:collectionName/order'), admin.orderDocuments.bind(admin));
    app.post(url_join(root, '/json/model/:modelName/action/:actionId'), admin.actionDocuments.bind(admin));
    app.delete(url_join(root, '/json/model/:collectionName/document'), admin.deleteDocument.bind(admin));
};
