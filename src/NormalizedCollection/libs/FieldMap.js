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
    var dep = f.path.getDependency();
    if(dep !== null && getDepField(this.fields, dep) === null) {
      throw new Error('Dynamic paths must reference a field declared in the map. Please add ' +
        FieldMap.key(dep.path, dep.field) + ' to the select() criteria before using it in a ' +
        'dynamic field');
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

  aliasFor: function(url) {
    var f = util.find(this.fields, function(f) {
      return f.url === url;
    }, this);
    return f? f.alias : null;
  },

  /**
   * Pulls data out of a snapshot aliased by the field map. Only keys in the field map
   * will be returned. Always returns an object. Does not return a priority at the root
   * level but will return priorities for all children. If the snapshot contains a primitive,
   * an empty object will be returned.
   *
   * This is not intended to provide finalized values but instead to provide an object representation
   * of each snapshot useful for merging snapshot data into a finalized value (see Record.mergeData)
   *
   * @param {object} snapshot a Firebase snapshot
   * @param {boolean} [isExport]
   * @returns {object}
   */
  extractData: function(snapshot, isExport) {
    var out = {};
    var pathName = this.pathMgr.getPathName(snapshot.ref().toString());
    if( pathName === null && snapshot.ref().parent() !== null ) {
      var parentPath = this.pathMgr.getPathFor(snapshot.ref().parent().toString());
      if( parentPath && parentPath.hasDependency() ) {
        pathName = parentPath.name();
      }
    }
    var fx = isExport? 'exportVal' : 'val';
    util.each(this.fieldsFor(pathName), function(f) {
      switch(f.id) {
        case '$key':
          putIn(out, f.alias, snapshot.key());
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
   * snapshot containing the corresponding field. If no snapshot matches a field in this map,
   * it will return null.
   *
   * @param {Array} snaps a list of Firebase snapshots
   * @param {String} fieldName
   * @returns {object|null}
   */
  snapFor: function(snaps, fieldName) {
    var url;
    var path = this.pathFor(fieldName);
    if( !path ) { return null; }
    var dep = path.getDependency();
    if( dep !== null ) {
      var depField = getDepField(this.fields, dep);
      var depSnap = this.snapFor(snaps, depField.alias);
      if( depSnap ) {
        if (dep.field === '$key') {
          url = path.child(depSnap.key()).url();
        }
        else if (dep.field === '$value') {
          url = path.child(depSnap.val()).url();
        }
        else {
          url = path.child(depSnap.child(dep.field).val()).url();
        }
      }
    }
    else {
      url = path.url();
    }
    if( url ) {
      return util.find(snaps, function (snap) {
          return snap.ref().toString() === url;
        }) || null;
    }
    else {
      return null;
    }
  },

  /**
   * Since data can be nested under child keys, this method returns a map of fields->data which
   * is flattened for each key.
   *
   * @param {object} data
   * @returns {object} an array containing [ [Path, Object]... ] where each object is a key/value store
   */
  denest: function(data) {
    var out = {};
    util.each(this.getPathManager().getPaths(), function(p) {
      out[p.name()] = { path: p, data: {} };
    });

    this.forEach(function(field) {
      var val = getOut(data, field.alias);
      if( val !== util.undef ) {
        switch(field.id) {
          case '$value':
            out[field.pathName].data = val;
            break;
          case '$key':
            // do nothing
            break;
          default:
            out[field.pathName].data[field.id] = val;
        }
      }
    });
    return out;
  },

  idFor: function(fieldName) {
    var f = this.getField(fieldName);
    if( !f ) { return fieldName; }
    return f.id;
  }
};

FieldMap.key = function(path, field) {
  if( typeof path !== 'string' ) {
    path = path.name();
  }
  return path + '.' + field;
};

FieldMap.fieldMap = function(map, fieldName) {
  var childPath;
  var field = map.getField(fieldName);
  if( field ) {
    childPath = field.path;
    if( field.id !== '$value' ) {
      childPath = childPath.child(field.id);
    }
  }
  else {
    childPath = map.pathFor(fieldName).child(fieldName);
  }
  var pm = new PathManager([childPath]);
  var fm = new FieldMap(pm);
  fm.add({key: FieldMap.key(childPath, '$value'), alias: fieldName});
  return fm;
};

/**
 * Fetch a list of paths suitable for use in a Record.
 *
 * @param {FieldMap} map to be copied
 * @param {string} recordId the push id for the record
 * @returns {FieldMap} a copy of the field map with paths ajusted down to the child node
 */
FieldMap.recordMap = function(map, recordId) {
  var mgr = map.getPathManager();
  var paths = util.map(mgr.getPaths(), function(p) {
    return p.normChild(recordId);
  });
  var childMap = new FieldMap(new PathManager(paths));
  map.forEach(function(field) {
    childMap.add({key: field.key, alias: field.alias});
  });
  return childMap;
};

function getDepField(fields, dep) {
  return util.find(fields, function(field) {
    return field.pathName === dep.path && field.id === dep.field;
  }) || null;
}

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

function getOut(data, alias) {
  var key = alias;
  if( !util.isObject(data) ) { return util.undef; }
  var val = data[alias];
  if( alias.indexOf('.') > 0 ) {
    var parts = alias.split('.').reverse();
    val = data;
    while(parts.length) {
      key = parts.pop();
      val = util.isObject(val) && val.hasOwnProperty(key)? val[key] : util.undef;
    }
  }
  return val;
}

module.exports = FieldMap;