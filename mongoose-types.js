var util = require('util');

var CDN_PREFIX = '';

exports.setCdnPrefix = function(prefix) {
    CDN_PREFIX = prefix;
};

exports.loadTypes = function(mongoose)
{
    var File = function File(path,options)
    {
        File.super_.call(this,path,options);
    };
    util.inherits(File,mongoose.Schema.Types.Mixed);
    File.prototype.cast = function(value,doc,init) {
        var ret =  File.super_.prototype.cast.call(this,value,doc,init);
        if(ret && ret.path && CDN_PREFIX)
            ret.url = CDN_PREFIX + ret.path;
        return ret;
    };

    mongoose.Types.File = Object;
    mongoose.Schema.Types.File = File;

    exports.File = File;



    var Integer = function Integer(path,options)
    {
        Integer.super_.call(this, path, options);
    };
    util.inherits(Integer,mongoose.Schema.Types.Number);
    Integer.prototype.cast = function(value,doc,init)
    {
        var num = Integer.super_.prototype.cast.call(this, value, doc, init);
        return Math.floor(num);
    };

    mongoose.Types.Integer = Number;
    mongoose.Schema.Types.Integer = Integer;

    exports.Integer = Integer;
    
    var GeoPoint = function GeoPoint(path,options) {
        GeoPoint.super_.call(this,path,options);
    };
    util.inherits(GeoPoint,mongoose.Schema.Types.Mixed);

    exports.GeoPoint = GeoPoint;

    mongoose.Types.GeoPoint = Object;
    mongoose.Schema.Types.GeoPoint = GeoPoint;

    var Text = function Text(path,options) {
        Text.super_.call(this,path,options);
    };
    util.inherits(Text,mongoose.Schema.Types.String);

    exports.Text = Text;

    mongoose.Types.Text = String;
    mongoose.Schema.Types.Text = Text;

    var Html = function Html(path,options) {
        Html.super_.call(this,path,options);
    };
    util.inherits(Html,Text);

    exports.Html = Html;

    mongoose.Types.Html = String;
    mongoose.Schema.Types.Html = Html;
};

