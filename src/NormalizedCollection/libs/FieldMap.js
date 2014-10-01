'use strict';

var util = require('../../common');

function FieldMap() {
  this.fields = {};
  this.length = 0;
}

FieldMap.prototype = {
  add: function(fieldProps) {
    var f = new Field(parseProps(fieldProps));
    if( this.fields.hasOwnProperty(f.alias) ) {
      throw new Error('Duplicate field alias ' + f.alias + '(' + f.path +  '.' + f.id + ')');
    }
    this.fields[f.alias] = f;
    this.length++;
  },

  pathFor: function(fieldName) {
    var f = this.get(fieldName);
    return f? f.path : null;
  },

  fieldsFor: function(pathName) {
    return util.filter(util.toArray(this.fields), function(f) {
      return f.path === pathName;
    });
  },

  'get': function(fieldName) {
    return this.fields[fieldName]||null;
  },

  copy: function() {
    var fm = new FieldMap();
    util.each(this.fields, function(v) {
      fm.add(v);
    });
    return fm;
  }
};

FieldMap.key = function(path, field) {
  return path + '.' + field;
};

function Field(props) {
  // these properties are considered public and accessed directly by other classes
  this.path = props.path;
  this.id = props.id;
  this.raw = props.raw;
  this.alias = props.alias;
}

Field.prototype = {
  name: function() { return this.alias; }
};

function parseProps(propsRaw) {
  if( typeof(propsRaw) === 'string' ) {
    propsRaw = { key: propsRaw };
  }
  else if( propsRaw instanceof Field ) {
    return util.pick(propsRaw, ['path', 'id', 'raw', 'alias']);
  }
  var parts = propsRaw.key.split('.');
  return {
    path: parts[0],
    id: parts[1],
    raw: propsRaw.key,
    alias: propsRaw.alias || parts[1]
  };
}

module.exports = FieldMap;