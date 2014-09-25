'use strict';

//todo we need a path alias map here
function FieldMap() {
  this.fields = {};
  this.length = 0;
}

FieldMap.prototype = {
  add: function(fieldProps) {
    var f = new Field(parseProps(fieldProps));
    if( this.fields.hasOwnProperty(f.alias) ) {
      throw new Error('Duplicate field ' + f.alias);
    }
    this.fields[f.alias] = f;
    this.length++;
  },

  pathFor: function(fieldName) {
    var f = this.get(fieldName);
    return f? f.path : null;
  },

  fieldsFor: function(pathName) {
    return util.filter(this.fields, function(f) {
      return f.path === pathName;
    });
  },

  'get': function(fieldName) {
    return this.fields[fieldName]||null;
  }
};

FieldMap.key = function(path, field) {
  return path + '.' + field;
};

function Field(props) {
  this.path = props.path;
  this.id = props.id;
  this.raw = props.raw;
  this.alias = props.alias;
}

Field.prototype = {

};

function parseProps(propsRaw) {
  if( typeof(propsRaw) === 'string' ) {
    propsRaw = { key: propsRaw };
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