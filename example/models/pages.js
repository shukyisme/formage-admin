var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

var schema = new Schema({
//    parent: { type: ObjectId, ref: 'pages' },
    title: { type: String, required: true },
    enum: { type: String, enum: ['', 'A', 'B', 'C'] },
    list: [{
        name: { type: String, required: true }
    }]
});

schema.methods.toString = function() {
    return this.title;
};

module.exports = mongoose.model('pages', schema);