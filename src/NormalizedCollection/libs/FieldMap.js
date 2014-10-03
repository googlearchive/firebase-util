'use strict';

var util = require('../../common');
var PathManager = require('./PathManager');

function FieldMap(pathManager) {
  this.fields = {};
  this.length = 0;
  this.pathMgr = pathManager;
}

FieldMap.prototype = {
  add: function(fieldProps) {
    var f = new Field(parseProps(fieldProps, this.pathMgr));
    if( this.fields.hasOwnProperty(f.alias) ) {
      throw new Error('Duplicate field alias ' + f.alias + '(' + f.key + ')');
    }
    if( f.path === null ) {
      throw new Error('Invalid path specified for field ' + f.key + '; it was not in the paths ' +
        'provided, which are : ' + util.map(this.pathMgr.paths, function(p) { return p.name() }).join(', '));
    }
    this.fields[f.alias] = f;
    this.length++;
  },

  'get': function(fieldName) {
    return this.fields[fieldName]||null;
  },

  hasField: function(fieldName) {
    return util.has(this.fields, fieldName);
  },

  hasFieldId: function(pathUrl, fieldId) {
    return this.hasField(this.aliasFor(pathUrl, fieldId));
  },

  pathFor: function(fieldName) {
    var f = this.get(fieldName);
    return f? f.path : this.pathMgr.first();
  },

  fieldsFor: function(pathName) {
    return util.filter(util.toArray(this.fields), function(f) {
      return f.pathName === pathName;
    });
  },

  aliasFor: function(pathUrl, fieldId) {
    var f = util.find(this.fields, function(f) {
      return f.path.url() === pathUrl && fieldId === f.id;
    }, this);
    return f? f.alias : null;
  }
};

FieldMap.key = function(path, field) {
  if( typeof path !== 'string' ) {
    path = path.name();
  }
  return path + '.' + field;
};

function Field(props) {
  // these properties are considered public and accessed directly by other classes
  this.path = props.path;
  this.id = props.id;
  this.key = props.key;
  this.alias = props.alias;
  this.pathName = props.pathName;
}

function parseProps(propsRaw, pathMgr) {
    //todo this isn't quite right, we need to use the pathManager to get the unaliased keys
  if( propsRaw instanceof Field ) {
    return util.pick(propsRaw, ['path', 'id', 'key', 'alias', 'pathName']);
  }
  else if( typeof(propsRaw) === 'string' ) {
    propsRaw = { key: propsRaw };
  }
  var parts = propsRaw.key.split('.');
  var path = pathMgr.getPath(parts[0]);
  return {
    pathName: parts[0],
    id: parts[1],
    key: propsRaw.key,
    alias: propsRaw.alias || parts[1],
    path: path
  };
}

module.exports = FieldMap;