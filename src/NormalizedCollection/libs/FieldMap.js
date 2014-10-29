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
        'provided, which are : ' + this.pathMgr.getPathNames().join(','));
    }
    this.fields[f.alias] = f;
    this.length++;
  },

  forEach: function(callback, context) {
    return util.find(this.fields, callback, context) !== util.undef;
  },

  getField: function(fieldName) {
    return this.fields[fieldName]||null;
  },

  getPath: function(pathName) {
    return this.getPathManager().getPath(pathName);
  },

  getPathManager: function() {
    return this.pathMgr;
  },

  pathFor: function(fieldName) {
    var f = this.getField(fieldName);
    return f? f.path : this.pathMgr.first();
  },

  fieldsFor: function(pathName) {
    return util.filter(util.toArray(this.fields), function(f) {
      return f.pathName === pathName;
    });
  },

  idFor: function(fieldName) {
    var f = this.getField(fieldName);
    if( f ) {
      return f.id;
    }
    return fieldName;
  },

  aliasFor: function(url) {
    var f = util.find(this.fields, function(f) {
      return f.url === url;
    }, this);
    return f? f.alias : null;
  },

  /**
   * Pulls data out of a snapshot aliased by the field map. Only keys in the field map
   * will be returned. Always returns an object. Does not return a priority at the root
   * level but will return priorties for all children. If the snapshot contains a primitive,
   * an empty object will be returned.
   *
   * This is not intended to provide finalized values but instead to provide an object representation
   * of each snapshot useful for merging snapshot data into a finalized value (see Record.mergeData)
   *
   * @param {object} snapshot a Firebase snapshot
   * @param {boolean} isExport
   * @returns {object}
   */
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
    return out;
  },

  /**
   * Given an array of snapshots and an aliased fieldName, this will return the appropriate
   * snapshot containing the corresponding field. If no snapshot matches, it will return null.
   *
   * @param {Array} snaps a list of Firebase snapshots
   * @param {String} fieldName
   * @returns {object|null}
   */
  snapFor: function(snaps, fieldName) {
    var url = this.pathFor(fieldName).url();
    return util.find(snaps, function(snap) {
      return snap.ref().toString() === url;
    }) || null;
  }
};

FieldMap.key = function(path, field) {
  if( typeof path !== 'string' ) {
    path = path.name();
  }
  return path + '.' + field;
};

FieldMap.fieldMap = function(map, fieldName) {
  var childPath = map.pathFor(fieldName).child(fieldName);
  var pm = new PathManager([childPath]);
  var fm = new FieldMap(pm);
  fm.add({key: FieldMap.key(childPath, '$value'), alias: fieldName});
  return fm;
};

FieldMap.recordMap = function(map, fieldName) {
  var mgr = map.getPathManager();
  var fieldId = map.idFor(fieldName);
  var paths = util.map(mgr.getPaths(), function(p) {
    return p.child(fieldId);
  });
  var childMap = new FieldMap(new PathManager(paths));
  map.forEach(function(field) {
    childMap.add(field);
  });
  return childMap;
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
    //todo-dynamic-keys this isn't correct for dynamic fields :(
    //todo-dynamic-keys and probably not for $value and $key either
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