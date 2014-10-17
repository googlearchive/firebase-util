'use strict';

var util = require('../../common');

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
        'provided, which are : ' + this.pathMgr.getPathNames().join(','));
    }
    this.fields[f.alias] = f;
    this.length++;
  },

  'get': function(fieldName) {
    return this.fields[fieldName]||null;
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

  aliasFor: function(url) {
    var f = util.find(this.fields, function(f) {
      return f.url === url;
    }, this);
    return f? f.alias : null;
  },

  extractData: function(snapshot, isExport) {
    var out = {};
    var pathName = this.pathMgr.getPathName(snapshot.ref().toString());
    var fx = isExport? 'exportVal' : 'val';
    util.each(this.fields, function(f) {
      if(f.pathName !== pathName ) { return; }
      switch(f.id) {
        case '$key':
          putIn(out, f.alias, snapshot.name());
          break;
        case '$value':
          putIn(out, f.alias, snapshot[fx]());
          break;
        default:
          if( snapshot.hasChild(f.id) ) {
            putIn(out, f.alias, snapshot.child(f.id)[fx]());
          }
      }
    });
    if( isExport && snapshot.getPriority() !== null ) {
      out['.priority'] = snapshot.getPriority();
    }
    return out;
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
  this.url = props.url;
  this.pathName = props.pathName;
  this.isNested = props.alias.indexOf('.') >= 0;
}

function parseProps(propsRaw, pathMgr) {
  if( propsRaw instanceof Field ) {
    return util.pick(propsRaw, ['path', 'id', 'key', 'alias', 'pathName', 'url']);
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
    path: path,
    url: path? path.url() + '/' + parts[1] : null
  };
}

function putIn(data, alias, val) {
  if( val === null ) { return; }
  if( alias.indexOf('.') > 0 ) {
    var parts = alias.split('.').reverse(), p;
    while(parts.length > 1 && (p = parts.pop())) {
      data = data[p] = util.has(data, p)? data[p] : {};
    }
    alias = parts.pop();
  }
  data[alias] = val;
}

module.exports = FieldMap;