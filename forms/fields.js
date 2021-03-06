'use strict';
if (!module.parent) console.error('Please don\'t call me directly.I am just the main app\'s minion.') || process.process.exit(1);

var widgets = require('./widgets'),
    async = require('async'),
	Class = require('sji'),
	_ = require('lodash'),
	common = require('./common'),
	path = require('path'),
	fs = require('fs'),
	util = require('util');
	
	
var cloudinary;

try {
   cloudinary = require('cloudinary');
 } catch(ex) {}

var mongoose = require('mongoose');

var UPLOAD_DIRECTROY =  (path.join(__dirname, '..','..', '..', 'public', 'cdn') + '/');

exports.setAmazonCredentials = function (credentials) {
    try {
        var knox = require('knox');
        module.knox_client = knox.createClient(credentials);
    }
    catch (e) {
        util.puts('no knox');
    }
};

exports.setUploadDirectory = function(folder){
    UPLOAD_DIRECTROY = folder;
}

exports.getKnoxClient = function () {
    return module.knox_client;
};

var global_counter = 0;


var simpleReq = function (req) { return _.pick(req, ['files', 'body']); };


var BaseField = exports.BaseField = Class.extend({
    init: function (options) {
        options = options || {};
        this.options = options;
        this.emptyIsNull = typeof(options.emptyIsNull) == 'undefined' ? true : options.emptyIsNull;
        this['default'] = options['default'];
        this.required = options.required == null ? false : options.required;
        this.readOnly = options.readOnly || false;
        this.validators = options.validators || [];
        var widget_options = _.extend({}, options, options.widget_options);
        options.widget_options = widget_options;
        widget_options.attrs = options.attrs || {};
        widget_options.required = widget_options.required == null ? this.required : widget_options.required;
        widget_options.help = options.help;
        this.widget = new options.widget(widget_options);
        this.value = null;
        this.errors = [];
        this.name = '';
        this.label = options.label;
    },
    get_static: function () {
        return this.widget.static;
    },
    to_schema: function () {
        var schema = {};
        if (this.required)
            schema['required'] = true;
        if (this['default'] != null)
            schema['default'] = this['default'];
        return schema;
    },
    get_label: function () {
        var label = this.label || this.name;
        var arr = label.split('_');
        for (var i = 0; i < arr.length; i++) {
            if (arr[i])
                arr[i] = arr[i][0].toUpperCase() + arr[i].substring(1);
        }
        return arr.join(' ');
    },
    render_label_str: function () {
        return common.writer_to_string(this.render_label, 80);
    },
    render: function (res) {
        this.widget.name = this.name;
        this.widget.value = this.value;
        this.widget.render(res);
        return this;
    },
    render_str: function () {
        return common.writer_to_string(this.render, 1024);
    },
    render_label: function (res) {
        var class_str = 'field_label' + ('optional_label' in this.widget.attrs.class ? ' optional_label' : '');
        res.write('<label for="id_' + this.name + '" class="' + class_str + '">' + this.get_label() + '</label>\n');
    },
    render_with_label: function (res) {
        res.write('<div class="field" ' + (this.options.help ? 'title="' + this.options.help + '"' : '') + '>\n');
        this.render_label(res);
        this.render(res);
        this.render_error(res);
        res.write('</div>\n');
    },
    render_with_label_str: function () {
        return common.writer_to_string(this.render_with_label, 1024);
    },
    render_error: function (res) {
        if (this.errors && this.errors.length) {
            for (var i = 0; i < this.errors.length; i++) {
                res.write('\n<span class="error">');
                res.write(this.errors[i] + '');
                res.write('</span>\n');
            }
        }
    },
    set: function (value) {
        this.value = arguments.length === 0 ? this['default'] : value;
        return this;
    },
    clean_value: function (req, callback) {
        if (this.emptyIsNull && String(this.value) === '' && !Array.isArray(this.value))
            this.value = null;
        if ((this.value === null || this.value === []) && this.required)
            this.errors.push('this field is required');
        for (var i = 0; i < this.validators.length; i++) {
            var result = this.validators[i](this.value);
            if (result !== true) {
                this.errors.push(result);
            }
        }
        callback(null);
        return this;
    },
    pre_render: function (callback) {
        this.widget.name = this.name;
        this.widget.value = this.value;
        this.widget.pre_render(callback);
    }
});


var StringField = exports.StringField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.TextWidget;
        this._super(options);
        this.type = 'string';
    },
    to_schema: function () {
        var schema = StringField.super_.prototype.to_schema.call(this);
        schema['type'] = String;
        return schema;
    }
});


var ReadonlyField = exports.ReadonlyField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.HiddenWidget;
        this._super(options);
    },
    render_label: function () {},
    render_with_label: function (res) {
        this.render(res);
    }
});


var BooleanField = exports.BooleanField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.CheckboxWidget;
        this._super(options);
    },
    to_schema: function () {
        var schema = BooleanField.super_.prototype.to_schema.call(this);
        schema['type'] = Boolean;
        return schema;
    },
    clean_value: function (req, callback) {
        this.value = !!(req.body[this.name] && req.body[this.name] !== '');
        this._super(simpleReq(req), callback);
        return this;
    }
});


var EnumField = exports.EnumField = BaseField.extend({
    init: function (options, choices) {
        options = options || {};
        options.emptyIsNull = options.emptyIsNull || false;
        options.widget = options.widget || widgets.ChoicesWidget;
        options.widget_options = options.widget_options || {};
        options.widget_options.choices = options.widget_options.choices || choices;
        options.required = true;
        this._super(options);
    },
    to_schema: function () {
        var schema = this._super();
        schema['type'] = String;
        schema['enum'] = this.choices;
        return schema;
    },
    clean_value: function (req, callback) {
        if (this.value === ''){
            var hasEmpty = false;
            for(var i=0; i<this.options.widget_options.choices.length; i++){
                var choice = this.options.widget_options.choices[i];
                if(typeof(choice) == 'string' && choice === ''){
                    hasEmpty = true;
                    break;
                }
                else if(typeof(choice) == 'object' && choice[0] === ''){
                    hasEmpty = true;
                    break;
                }
            }
            if(!hasEmpty)
                this.value = null;
        }
        this._super(simpleReq(req), callback);
        return this;
    }
});


var EnumMultiField = exports.EnumMultiField = EnumField.extend({
    init: function (options, choices) {
        options = options || {};
        options.attrs = options.attrs || {};
        options.attrs.multiple = typeof(options.attrs.multiple) === 'undefined' ? 'multiple' : options.attrs.multiple;
        this._super(options, choices);
    },
    clean_value: function (req, callback) {
        if (!this.value)
            this.value = [];
        if (!Array.isArray(this.value))
            this.value = [this.value];
        this._super(simpleReq(req), callback);
        return this;
    }
});


var RefField = exports.RefField = EnumField.extend({
    init: function (options, ref) {
        this.ref = ref;
        if (!this.ref)
            throw new TypeError('Model was not provided');
        options = options || {};
        var required = options ? (options.required == null ? false : options.required) : false;
        options.widget = options.widget || widgets.RefWidget;
        options.widget_options = options.widget_options || {};
        options.widget_options.ref = options.widget_options.ref || ref;
        options.widget_options.constraints = options.widget_options.constraints || options.constraints;
        options.widget_options.required = options.required;
        options.widget_options.limit = options.limit;
        this._super(options, []);
        this.required = required;
    },
    to_schema: function () {
        var schema = RefField.super_.prototype.to_schema.call(this);
        schema['type'] = mongoose.Schema.ObjectId;
        schema['ref'] = this.ref + '';
        return schema;
    }
});


var NumberField = exports.NumberField = StringField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.NumberWidget;
        options.widget_options = options.widget_options || {};
        options.widget_options.min = options.widget_options.min == null ? options.min : options.widget_options.min;
        options.widget_options.max = options.widget_options.max == null ? options.max : options.widget_options.max;
        options.widget_options.step = options.widget_options.step == null ? options.step : options.widget_options.step;

        this._super(options);
    },
    to_schema: function () {
        var schema = this._super();
        schema['type'] = Number;
        return schema;
    },
    clean_value: function (req, callback) {
        if ((this.value === null || this.value === '' || this.value === undefined) && !this.required)
            this.value = null;
        else {
            try {
                this.value = Number(this.value);
                if(Number.isNaN(this.value))
                    this.value = null;
            }
            catch (e) {
                this.errors.push('value ' + this.value + ' is not a number');
                this.value = null;
            }
        }
        this._super(simpleReq(req), callback);
        return this;
    }
});


var DateField = exports.DateField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.DateWidget;
        this._super(options);
    },

    to_schema: function () {
        var schema = this._super();
        schema['type'] = Date;
        return schema;
    },
    clean_value:function(req,callback){
        if(this.value){
            var ts = Date.parse(this.value);
            if(isNaN(ts))
                ts = Number(this.value);
            this.value = isNaN(ts) ? null : new Date(ts);
        }
        return this._super(req,callback);
    }
});

var TimeField = exports.TimeField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.TimeWidget;
        this._super(options);
    },

    to_schema: function () {
        var schema = this._super();
        schema['type'] = String;
        return schema;
    }
});


function extractSubFieldKeyAndName(field_name, prefix) {
    var pre_len = prefix.length;
    var next_ = field_name.indexOf('_', pre_len);
    var key = field_name.substring(pre_len, next_);
    var name = field_name.substring(next_ + 1);
    return {key: key, name: name};
}


var ListField_ = exports.ListField = BaseField.extend({
    init: function (options, fields, fieldsets) {
        options = options || {};
        options['default'] = options['default'] || [];
        options.widget = options.widget || widgets.ListWidget;
        this._super(options);
        this.fields = fields;
        this.fieldsets = fieldsets;
    },
    set:function(value){
        return this._super(Array.isArray(value)?value:value&&[value]);
    },
    to_schema: function () {
        var schema = this._super();
        schema['type'] = Array;
        return schema;
    },
    clean_value: function (req, callback) {
        // casting and validation
        var self = this;
        var base = self._super;
        var prefix = self.name + '_li';
        var old_list_value = self.value || {};
        self.value = [];
        var clean_funcs = [];
        self.children_errors = [];
        
        function create_clean_func(field_name, post_data, file_data, output_data, old_value, parent_errors)
        {
            return function (cbk) {
                var inner_field = _.defaults({errors:[], name:field_name}, self.fields[field_name]);
				// lodash doesn't clone the prototype;
                inner_field.__proto__ = self.fields[field_name].__proto__;
                var request_copy = _.defaults({body:post_data, files:file_data}, req);
                var old_field_value = field_name in post_data ? post_data[field_name] : (old_value.get ? old_value.get(field_name) : old_value[field_name]);
                inner_field.form = self.form;
                inner_field.parent = self;
                inner_field.parentData = output_data;
                inner_field.set(old_field_value);
                inner_field.clean_value(request_copy, function (err) {
                    if (err) console.trace(err);
                    // if there are errors, populate to parent
                    if (inner_field.errors && inner_field.errors.length) {
                        self.errors = _.union(self.errors, inner_field.errors);
                        parent_errors[field_name] = _.clone(inner_field.errors);
                    }
                    // set data to output
                    //old_value[field_name] = inner_field.value;
                    output_data[field_name] = inner_field.value;
                    cbk(null);
                });
            }
        }

        // First subset req.files according to subfield prefix
        var inner_files = Object.keys(req.files)
            .filter(function (field_name) {return field_name.indexOf(prefix, 0) == 0;})
            .reduce(function (seed, field_name) {
                var pair = extractSubFieldKeyAndName(field_name, prefix);
                var key = pair.key;
                var name = pair.name;
                seed[key] = seed[key] || {};
                seed[key][name] = req.files[field_name];
                return seed;
            }, {});

        
        // Subset req.body according to subfield prefix and extract the submitted list order
        var new_key_order = [];
        var inner_body = Object.keys(req.body)
            .filter(function (field_name) {return field_name.indexOf(prefix, 0) == 0;})
            .reduce(function (seed, field_name) {
                var pair = extractSubFieldKeyAndName(field_name, prefix);
                var key = pair.key;
                var name = pair.name;

                // Order the "old" and new list items according to the submitted order (but only once per old index)
                !~new_key_order.indexOf(key) && new_key_order.push(key);

                seed[key] = seed[key] || {};
                seed[key][name] = req.body[field_name];
                return seed;
            }, {});

       
        // Setup the embedded fields according the new order
        new_key_order.forEach(function (key) {
            var output_data = {};
            var output_errors = {};
            self.value.push(output_data);
            self.children_errors.push(output_errors);
            Object.keys(self.fields).forEach(function (field_name) {
                clean_funcs.push(create_clean_func(
                    field_name,
                    inner_body[key] || {},
                    inner_files[key] || {},
                    output_data,
                    old_list_value[key] || {},
                    output_errors
                ));
            });
        });

        async.parallel(clean_funcs, function (err) {
            for (var i = 0; i < self.value.length; i++) {
                var new_dict = {};
                for (var key in self.value[i])
                    self.deep_write(new_dict, key, self.value[i][key]);
                self.value[i] = new_dict;
                if ('__self__' in self.value[i])
                    self.value[i] = self.value[i].__self__;
            }
            
            base.call(self, simpleReq(req), callback);
        });
        return self;
    },
    pre_render: function (callback) {
        var funcs = [];
        var self = this;

        self.widget.name = self.name;
        self.widget.value = self.value;

        function pre_render_partial(field_key) {
            return function (cbk) {
                var field = self.fields[field_key];
                field.set(_.map(self.value || [], function (obj) {
                    return (obj && obj[field_key]) || '';
                }));
                field.pre_render(function (err, results) {
                    cbk(err, results);
                });
            };
        }

        for (var field in self.fields) {
            funcs.push(pre_render_partial(field));
        }

        funcs.push(self.widget.pre_render.bind(self.widget));
        async.parallel(funcs, function (err, results) {
            callback(err);
        });
        return self;
    },
    render: function (res) {
        var self = this;

        var children_errors = self.children_errors || [];

        function render_template(res) {
            var prefix = self.name + '_tmpl_';
            self.render_list_item(res, self.fields, self.fieldsets, prefix);
        }

        function render_item(res, i) {
            var prefix = self.name + '_li' + i + '_';
            self.render_list_item(res, self.fields, self.fieldsets, prefix, self.value[i], children_errors[i]);
        }

        this.widget.name = this.name;
        this.widget.value = this.value;
        self.widget.render(res, render_template, render_item);
        return self;
    },
    deep_write: function (object, name, value) {
        var parent = object;
        var parts = name.split('.');
        for (var i = 0; i < parts.length - 1; i++) {
            var child = parent[parts[i]] || {};
            parent[parts[i]] = child;
            parent = child;
        }
        parent[_.last(parts)] = value;
    },
    deep_read: function (object, name) {
        var parent = object;
        if (!parent)
            return null;
        var parts = name.split('.');
        for (var i = 0; i < parts.length - 1; i++) {
            parent = parent[parts[i]];
            if (!parent)
                return null;
        }
        if (!parent)
            return null;
        return parent[_.last(parts)];
    },
    render_list_item: function (res, fields, fieldsets, prefix, value, errors) {
        var self = this;
        errors = errors || {};

        function render_fields(fields) {
            for (var i = 0; i < fields.length; i++) {
                var field_name = fields[i];
                if (typeof(field_name) === 'object')
                    render_fieldset(field_name);
                else
                    render_field(field_name);
            }
        }

        function render_field(field_name) {
            var field = fields[field_name];
            if (!field)
                return;
            field.name = prefix + field_name;
            field.errors = errors[field_name] || [];
            field.widget.data['field'] = field_name;
            if (field_name === '__self__') {
                field.set(value);
                field.render(res);
            } else {
                field.set(value ? self.deep_read(value, field_name) : null);
                field.render_with_label(res);
            }
        }

        function render_fieldset(fieldset) {
            if (fieldset['title'] && fieldset['title'] !== '')
                res.write('<div class="nf_fieldset">');
            var title = fieldset['title'] || '';
            if (title !== '')
                res.write('<h2>' + title + '</h2>');
            var fields = fieldset.fields;
            if (fields)
                render_fields(fields);
            if (fieldset['title'] && fieldset['title'] !== '')
                res.write("</div>");
        }

        if (fieldsets) {
            render_fields(fieldsets[0].fields);
        }
        else
            render_fields(Object.keys(fields));
    }

});

var MultiRefField = exports.MultiRefField = RefField.extend({
	init: function (options,ref) {
		options = options || {};
		options.attrs = options.attrs || {};
		options.attrs.multiple = true;
		this._super(options,ref);
	}
});

var TempFileField = exports.TempFileField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.FileWidget;
        this._super(options);
    },
    clean_value: function (req, callback) {
        if (req.files && req.files[this.name]) {
            var uploaded_file = req.files[this.name];
            if(Array.isArray(uploaded_file))
                this.value = uploaded_file.map(function(file){
                    return {
                        path:file.path,
                        size: file.size,
                        originalFilename:file.originalFilename,
                        timestamp:Date.now()
                    };
                });
            else
                this.value = {
                    path:uploaded_file.path,
                    size: uploaded_file.size,
                    originalFilename:uploaded_file.originalFilename,
                    timestamp:Date.now()
                };
        }
        this._super(simpleReq(req), callback);

    }

});


var FileField_ = exports.FileField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.FileWidget;
        //noinspection JSUnresolvedVariable
        this.directory = options.upload_to || UPLOAD_DIRECTROY;
        this._super(options);
    },
    to_schema: function () {
        return {
            url: String,
            name: String,
            size: Number
        };
    },
    create_filename: function (file) {
        var ext = path.extname(file).replace(/\./g,'');
        var basename = path.basename(file, ext).replace(/\./g,'');
        var unique = (Date.now() + global_counter++) % 1000;
        var filename = util.format('%s_%d.%s', basename, unique, ext);
        return filename;
    },
    clean_value: function (req, callback) {
        var self = this;
        var base = self._super;
        self.value = self.value || {};
        function on_finish() {
            if(self.value && !self.value.url)
                self.value = null;
            base.call(self, simpleReq(req), callback);
        }

        function handleDelete(cbk){
            if(module.knox_client){
                // Remove file from S3 Bucket
                self.value = null;
                if(cbk)
                    cbk();
            }
            else
                fs.unlink(self.directory + self.value.path, function(err){
                    if(err)
                        console.error('unlink failed',err.stack);
                    cbk();
                });
            self.value = null;
        }

        function getContentType(path){
            var parts = path.split('.');
            var ext = parts[parts.length-1].toLowerCase();
            switch(ext){
                case 'jpg':
                case 'jpeg':
                    return 'image/jpeg';
                case 'png':
                    return 'image/png';
                case 'gif':
                    return 'image/gif';
                case 'bmp':
                    return 'image/bmp';
                case 'tiff':
                    return 'image/tiff';
                case 'txt':
                    return 'text/plain';
                default:
                    return 'binary/octet-stream';
            }
        }

        function handle_upload(err) {
            if (err) console.trace(err);
            if (!req.files || !req.files[self.name] || !req.files[self.name].name) {
                on_finish();
                return;
            }
            var uploaded_file = req.files[self.name];
            // copy file from temp location
            if (module.knox_client) {
                var stream = fs.createReadStream(uploaded_file.path);
                var filename_to_upload
                if(self.options.createFilename)
                    filename_to_upload = '/' + self.options.createFilename(self,uploaded_file.name);
                else
                    filename_to_upload = '/' + self.create_filename(uploaded_file.name);

                var contentType = getContentType(uploaded_file.path);
                module.knox_client.putStream(stream, filename_to_upload, {'Content-Length': uploaded_file.size,'Content-Type':contentType}, function (err, res) {
                    if (err) {
                        //noinspection JSUnresolvedVariable
                        if (err.socket && err.socket._httpMessage) {
                            res = err;
                        } else {
                            console.error('upload to amazon failed', err.stack || err);
                            return callback(err);
                        }
                    }

                    fs.unlink(uploaded_file.path);
                    //noinspection JSUnresolvedVariable
                    var http_message = res.socket._httpMessage;
                    var url = http_message.url.replace(/https:/, 'http:');
                    self.value = {
                        path: uploaded_file.name,
                        url: url,
                        size: uploaded_file.size,
                        timestamp:Date.now()
                    };
                    on_finish();
                });
            } else {
                var input_stream = fs.createReadStream(uploaded_file.path);
                var filename = self.create_filename(uploaded_file.path);
                var output_stream = fs.createWriteStream(path.join(self.directory, filename));
                input_stream.pipe(output_stream);
                input_stream.on("close", function (err) {
                    if (err) console.trace(err);
                    fs.unlink(uploaded_file.path, function (err) {
                        if (err) console.trace(err);
                        self.value = {
                            path: filename,
                            url: '/cdn/' + filename,
                            size: uploaded_file.size,
                            timestamp:Date.now()
                        };
                        on_finish();
                    });
                });
            }
        }

        // delete old file is needed/requested
        if (self.value && self.value.path && (req.body[self.name + '_clear'] || (req.files[self.name] && req.files[self.name].name))) {
            handleDelete(handle_upload);
        }
        else {
            handle_upload();
        }

    }
});



var PictureField = exports.PictureField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.PictureWidget;
        this._super(options);
    },
    to_schema: function () {
        return {
            public_id: String,
            version: Number,
            signature: String,
            width: Number,
            height: Number,
            format: String,
            resource_type: String,
            url: String,
            secure_url: String,
            eager: [Object],
            original_name: String,
            original_size: Number
        }

    },
    clean_value: function (req, callback) {
        var self = this;
        self.value = self.value || {};
        if (_.isString(self.value)) self.value = JSON.parse(self.value);

        if (self.value && self.value.url && req.body[self.name + '_clear']) {
            self.value = null;
        }
        var upload_input_name = self.name + '_file';
        if (req.files && req.files[upload_input_name] && req.files[upload_input_name].name) {
            cloudinary.uploader.upload(req.files[upload_input_name].path, function (result) {
                result.original_name = req.files[upload_input_name].name;
                result.original_size = req.files[upload_input_name].size;
                self.value = result;
                callback(null);
            },self.options.cloudinary);
        } else
            callback(null);
    }
});

var GeoField = exports.GeoField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.MapWidget;
        this.newGeoField = options.newGeoField;
        this._super(options);
    },
    clean_value: function (req, callback) {
        var str = this.value;
        var parts = str.split(',').map(function(part){return part.trim()});
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '')
            this.value = null;
        else {
            if(this.newGeoField)
                this.value = { geometry: [Number(parts[0]), Number(parts[1])]};
            else
                this.value = { geometry: { lat: Number(parts[0]), lng: Number(parts[1])}};

            if (this.name + '_address' in req.body) {
                this.value.address = req.body[this.name + '_address'];
            }
        }
        this._super(simpleReq(req), callback);
    }
});

var GeoAreaField = exports.GeoAreaField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.MapAreaWidget;
        this._super(options);
    },
    clean_value: function (req, callback) {
        var str = this.value;
        var points = str.split(/\s*;\s*/);
        var topLeft = this.parsePoint(points[0]);
        var bottomRight = this.parsePoint(points[1]);
        if(!topLeft || !bottomRight)
            this.value = null;
        else
            this.value = {topLeft:topLeft,bottomRight:bottomRight};
        this._super(simpleReq(req), callback);
    },
    parsePoint : function(str,address){
        var parts = str.split(',').map(function(part){return part.trim()});
        if (parts.length !== 2 || parts[0] === '' || parts[1] === '')
            return null;
        else
            return { geometry: { lat: Number(parts[0]), lng: Number(parts[1])}};
    }
});

var DictField = exports.DictField = BaseField.extend({
    init: function (options) {
        options = options || {};
        options.widget = options.widget || widgets.TextAreaWidget;
        this._super(options);
    },
    clean_value: function (req, callback) {
        var str = this.value;
        try {
            this.value = JSON.parse(str);
        }
        catch (ex) {
            console.error('not a json', ex);
        }
        this._super(simpleReq(req), callback);
    },
    render: function (res) {
        this.value = JSON.stringify(this.value);
        this._super(res);
    }
});
