/*!
 * Firebase-util:  A set of experimental power tools for Firebase.
 *
 * Version: 0.2.5
 * URL: https://github.com/firebase/firebase-util
 * Date: 2015-08-20T17:16:45.677Z
 * License: MIT http://firebase.mit-license.org/
 */

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
// place fbutil onto Firebase.util namespace
// if we are in the browser and Firebase exists
if( global.Firebase ) {
  global.Firebase.util = require('firebase-util');
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"firebase-util":undefined}],2:[function(require,module,exports){

exports.NormalizedCollection = require('./libs/NormalizedCollection.js');
},{"./libs/NormalizedCollection.js":6}],3:[function(require,module,exports){
'use strict';

var util = require('../../common/');

/**
 * A Record represents a set of merged data. The hierarchy of a normalized Collection
 * can be traversed as normal using parent() and child() calls:
 *    - RecordSet: The root of a normalized collection; a set of merged Firebase paths
 *    - Record: A child of RecordSet obtained by calling .child(recordId)
 *    - RecordField: A child of Record or RecordField which represents a wrapped Firebase path (no longer normalized)
 *
 * We wrap all of these levels, including the RecordField's, so that the
 * parent() and child() calls work as expected and return the normalized chain instead
 * of reverting to the underlying Firebase instances.
 *
 * AbstractRecord provides common functionality around observables, event handling, and field maps
 * used by all three implementations.
 *
 * @param fieldMap the field map applied to Record objects
 * @param {String} name
 * @param {String} url
 * @constructor
 */
function AbstractRecord(fieldMap, name, url) {
  var self = this;
  self._ref = null;
  self._map = fieldMap;
  self._name = name;
  self._url = url;
  self.lastMergedValue = util.undef; // starts undefined since first value may be null
  self._obs = new util.Observable(
    ['child_added', 'child_removed', 'child_changed', 'child_moved', 'value'],
    {
      onAdd: function(event) {
        var count = self._obs.getObservers(event).length;
        if( count === 1 ) {
          self._start(event, self._obs.getObservers().length);
        }
      },
      onRemove: function(event) {
        var count = self._obs.getObservers(event).length;
        if( count === 0 ) {
          self._stop(event, self._obs.getObservers().length);
        }
      }
    }
  );
}

AbstractRecord.prototype = {
  /**
   * Called internally by AbstractRecord whenever the first listener
   * is attached for a given event. Also includes a count of the
   * total number of listeners
   *
   * @param {string} type
   * @param {int} totalListeners
   * @abstract
   */
  _start: abstract('_start'),

  /**
   * Called internally by AbstractRecord whenever
   * the last listener is detached for a given type. Also provides
   * the total listener count
   *
   * @param {string} type
   * @param {int} totalListeners
   * @abstract
   */
  _stop:  abstract('_stop'),

  /**
   * Should return true if the snapshots provided contain the child key and if it
   * exists in the fields for this record type.
   *
   * @param {Array} snapshots
   * @param {string} key
   * @abstract
   */
  hasChild: abstract('hasChild'),

  /**
   * Given a list of snapshots to iterate, returns the valid keys
   * which exist in both the snapshots and the field map, in the
   * order they should be iterated.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: abstract('forEach'),

  /**
   * When .child() is called on a Snapshot, this will reconcile
   * the correct refs and data for each child and return an array
   * containing the child snapshots for the specified key. For
   * a RecordSet, this should return children for all the fields
   * in the field map. For a Record, this should return a child
   * from the correct snapshot, or the first if the child is not
   * in the map.
   *
   * @param {Array} snaps
   * @param {string} key
   * @abstract
   */
  getChildSnaps: abstract('getChildSnaps'),

  /**
   * This should take all the data from a set of snapshots and
   * merge it together appropriately. For a RecordSet, this should
   * return records ordered by the first reference. For a Record,
   * this should return the fields in the field map.
   *
   * @param {Array} snaps
   * @param {boolean} isExport
   * @abstract
   */
  mergeData: abstract('mergeData'),

  /**
   * Returns the specific implementing class for this instance.
   *
   * @returns {Function}
   */
  getClass: abstract('getClass'),

  /**
   * Saves data back to the correct paths
   *
   * @param data
   * @param {Object} props an object with callback[, context][, isUpdate]
   */
  saveData: abstract('saveData'),

  /**
   * Returns the priority for a given set of snapshots
   * @param {Array} snapshots
   * @return {int|string}
   */
  getPriority: abstract('getPriority'),

  /**
   * This returns the appropriate AbstractRecord type in the chain. Note that references
   * created here will not be usable until setRef() is called, so this should only be used
   * for passing into a Query. Use .child() for everything else.
   *
   * @param {String} childName
   * @return {AbstractRecord}
   */
  makeChild: abstract('makeChild'),

  /**
   * @param {string} event
   * @param {function} callback
   * @param {function} [cancel]
   * @param {object} [context]
   */
  watch: function(event, callback, cancel, context) {
    this._obs.observe(event, callback, cancel, context);
  },

  /**
   * @param {string} event
   * @param {function} [callback]
   * @param {object} [context]
   */
  unwatch: function(event, callback, context) {
    this._obs.stopObserving(event, callback, context);
  },

  getFieldMap: function() {
    return this._map;
  },

  getPathManager: function() {
    return this._map.getPathManager();
  },

  setRef: function(ref) {
    this._ref = ref;
  },

  getRef: function() {
    return this._ref;
  },

  /**
   * @param {String} key
   * @returns {Record}
   */
  child: function(key) {
    return this.getRef().ref().child(key).$getRecord();
  },

  /**
   * Returns an appropriate path name or merged set of names for this record type.
   * @return {String}
   */
  getName: function() {
    return this._name;
  },

  /**
   * Returns a Firebase URL or a merged set of URLs for the Record
   * @return {String}
   */
  getUrl: function() {
    return this._url;
  },

  trigger: function(snapshotFactory) {
    util.log.debug('AbstractRecord._trigger: %s', snapshotFactory.toString());
    this._obs.triggerEvent(snapshotFactory.event, snapshotFactory.create(this.getRef()));
  },

  /**
   * @param {object} error
   */
  _cancel: function(error) {
    util.error(error);
    this._obs.abortObservers(error);
  }
};

function abstract(method) {
  return function() {
    throw new Error('Classes implementing AbstractRecord must declare ' + method);
  };
}

module.exports = AbstractRecord;
},{"../../common/":25}],4:[function(require,module,exports){
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
},{"../../common":25,"./PathManager":10}],5:[function(require,module,exports){
'use strict';

var util = require('../../common');

function Filter() {
  this.criteria = [];
  util.each(arguments, this.add, this);
}

Filter.prototype = {
  add: function(fn) {
    this.criteria.push(
      new Condition(fn)
    );
  },
  test: function(recordData, key, priority) {
    return util.contains(this.criteria, function(cond) {
      return !cond.test(recordData, key, priority);
    }) === false;
  }
};

function Condition(fn) {
  this.match = fn;
}

Condition.prototype.test = function(data, key, priority) {
  return this.match(data, key, priority) === true;
};

module.exports = Filter;
},{"../../common":25}],6:[function(require,module,exports){
'use strict';

var util          = require('../../common');
var PathManager   = require('./PathManager');
var Filter        = require('./Filter');
var FieldMap      = require('./FieldMap');
var NormalizedRef = require('./NormalizedRef');
var RecordSet     = require('./RecordSet');

/**
 * @param {...object} path
 * @constructor
 */
function NormalizedCollection(path) { //jshint unused:vars
  assertPaths(arguments);
  this.pathMgr = new PathManager(arguments);
  this.map = new FieldMap(this.pathMgr);
  this.filters = new Filter();
  this.finalized = false;
}

NormalizedCollection.prototype = {
  select: function(fieldName) { //jshint unused:vars
    assertNotFinalized(this, 'select');
    var args = util.args('NormalizedCollection.select', arguments, 1);
    util.each(args.restAsList(0, ['string', 'object']), function(f) {
      assertValidField(f);
      this.map.add(f);
    }, this);
    return this;
  },

  filter: function(matchFn) { //jshint unused:vars
    assertNotFinalized(this, 'filter');
    var args = util.args('NormalizedCollection.filter', arguments, 1, 1);
    this.filters.add(
      args.nextReq('function')
    );
    return this;
  },

  ref: function() {
    if( !this.map.length ) {
      throw new Error('Must call select() with at least one field' +
        ' before creating a ref');
    }
    this.finalized = true;
    if( util.log.isInfoEnabled() ) {
      util.log.info('NormalizedRef created using %s', buildDebugString(this));
    }
    var recordSet = new RecordSet(this.map, this.filters);
    return new NormalizedRef(recordSet);
  }
};

function assertPaths(args) {
  if( args.length < 1 ) {
    throw new Error('Must provide at least one path definition');
  }
  function notValidRef(p) {
    if( util.isArray(p) ) {
      p = p[0];
    }
    return !util.isFirebaseRef(p);
  }
  if( util.contains(args, notValidRef) ) {
    throw new Error('Each argument to the NormalizedCollection constructor must be a ' +
      'valid Firebase reference or an Array containing a Firebase ref as the first argument');
  }
}

function assertNotFinalized(self, m) {
  if( self.finalized ) {
    throw new Error('Cannot call ' + m + '() after ref() has been invoked');
  }
}

function buildDebugString(nc) {
  var paths = [];
  var selects = [];
  var filter = '';

  util.each(nc.pathMgr.getPaths(), function(p) {
    var dep = p.getDependency();
    paths.push(
      util.printf('\t"%s%s"%s',
        p.url(),
        p.id() === p.name()? '' : ' as ' + p.name(),
        dep? '-> ' + dep.path + '.' + dep.field : ''
      )
    );
  });

  nc.map.forEach(function(f) {
    selects.push(util.printf('"%s%s"', f.key, f.alias === f.id? '' : ' as ' + f.alias));
    if( selects.length % 5 === 0 ) {
      selects.push('\n');
    }
  });

  if(nc.filters.criteria.length > 0) {
    filter = util.printf('<%s filters applied>', nc.filters.criteria.length);
  }

  return util.printf('NormalizedCollection(\n%s\n).select(%s)%s.ref()', paths.join('\n'), selects.join(', '), filter);
}

function assertValidField(f) {
  var k;
  if( typeof f === 'string' ) {
    k = f;
  }
  else {
    k = util.has(f, 'key')? f.key : util.undef;
  }
  if( typeof k !== 'string' || k.indexOf('.') <= 0 ) {
    throw new Error('Each field passed to NormalizedCollection.select() must either be a string ' +
    'in the format "pathAlias.fieldId", or an object in the format ' +
    '{key: "pathAlias.fieldId", alias: "any_name_for_field"}, but I received ' + JSON.stringify(f));
  }
}

module.exports = NormalizedCollection;
},{"../../common":25,"./FieldMap":4,"./Filter":5,"./NormalizedRef":7,"./PathManager":10,"./RecordSet":14}],7:[function(require,module,exports){
'use strict';

var util      = require('../../common');
var Query     = require('./Query');

function NormalizedRef(record, parent) {
  this._super(this, record);
  this._parent = parent||null;
  this._key = record.getName();
  this._toString = record.getUrl();
}

util.inherits(NormalizedRef, Query, {
  'child': function(fieldName) {
    var parts = fieldName.split('/').reverse(); // pop is faster than shift
    var parent = this;
    var ref = this;
    while(parts.length) {
      var key = parts.pop();
      ref = new NormalizedRef(ref.$getRecord().makeChild(key), parent);
      parent = ref;
    }
    return ref;
  },

  'parent': function() {
    return this._parent;
  },

  'root': function() {
    var p = this;
    while(p.parent() !== null) {
      p = p.parent();
    }
    return p;
  },

  /** @deprecated */
  'name': function() {
    console.warn('The name() function has been deprecated. Use key() instead.');
    return this.key();
  },

  'key': function() {
    return this._key;
  },

  'toString': function() {
    return this._toString;
  },

  //todo have set, update, push, remove attempt to revert any partial commits
  //todo by running a transaction and, if the value is still the "new" partial
  //todo value, then revert it to the old complete value

  'set': function(data, callback, context) {
    this.$getRecord().saveData(data, {callback: callback, context: context, isUpdate: false});
  },

  'update': function(data, callback, context) {
    this.$getRecord().saveData(data, {callback: callback, context: context, isUpdate: true});
  },

  'remove': function(callback, context) {
    this.$getRecord().saveData(null, {callback: callback, context: context, isUpdate: false});
  },

  'push': function(data, callback, context) { // jshint unused:false
    var uid = this.$getMaster().push().key();
    var child = this.child(uid);
    if( arguments.length ) {
      child.set.apply(child, arguments);
    }
    return child;
  },

  'setWithPriority': function(data, priority, callback, context) {
    this.$getRecord().saveData(data, {
      callback: callback, context: context, isUpdate: false, priority: priority
    });
  },

  'setPriority': function(priority, callback, context) {
    this.$getMaster().setPriority(priority, callback, context);
  },

  /****************************
   * WRAPPER FUNCTIONS
   ****************************/
  'auth': wrapMaster('auth'),
  'unauth': wrapMaster('unauth'),
  'authWithCustomToken': wrapMaster('authWithCustomToken'),
  'authAnonymously': wrapMaster('authAnonymously'),
  'authWithPassword': wrapMaster('authWithPassword'),
  'authWithOAuthPopup': wrapMaster('authWithOAuthPopup'),
  'authWithOAuthRedirect': wrapMaster('authWithOAuthRedirect'),
  'authWithOAuthToken': wrapMaster('authWithOAuthToken'),
  'getAuth': wrapMaster('getAuth'),
  'onAuth': wrapMaster('onAuth'),
  'offAuth': wrapMaster('offAuth'),
  'createUser': wrapMaster('createUser'),
  'changePassword': wrapMaster('changePassword'),
  'removeUser': wrapMaster('removeUser'),
  'resetPassword': wrapMaster('resetPassword'),
  'changeEmail': wrapMaster('changeEmail'),

  'goOffline': wrapAll('goOffline'),
  'goOnline': wrapAll('goOnline'),

  /****************************
   * UNSUPPORTED FUNCTIONS
   ***************************/
  'transaction': notSupported('transaction'), //todo use field map to pick fields and apply to each
  'onDisconnect': notSupported('onDisconnect') //todo use field map to pick fields and apply to each
});

function wrapAll(method) {
  return function() {
    var args = util.toArray(arguments);
    util.each(this.$getPaths(), function(p) {
      var ref = p.ref();
      ref[method].apply(ref, args);
    });
  };
}

function wrapMaster(method) {
  return function() {
    var args = util.toArray(arguments);
    var ref = this.$getMaster();
    return ref[method].apply(ref, args);
  };
}

function notSupported(method) {
  return function() {
    throw new Error(method + ' is not supported for NormalizedCollection references. ' +
      'Try calling it on the original reference used to create the NormalizedCollection instead.');
  };
}

module.exports = NormalizedRef;
},{"../../common":25,"./Query":11}],8:[function(require,module,exports){
'use strict';

var util = require('../../common');

function NormalizedSnapshot(ref, snaps) {
  this._ref = ref;
  this._rec = ref.$getRecord();
  if( !util.isArray(snaps) ) {
    throw new Error('Must provide an array of snapshots to merge');
  }
  this._pri = this._rec.getPriority(snaps);
  this._snaps = snaps;
}

NormalizedSnapshot.prototype = {
  val: function() {
    if( !this._snaps.length ) {
      return null;
    }
    return this._rec.mergeData(this._snaps, false);
  },

  child: function(key) {
    var snap;
    // keys may contain / to separate nested child paths
    // so make a list of child keys (we reverse it once
    // as this is faster than unshift() on each iteration)
    var childParts = key.split('/').reverse();
    // grab the first key and get the child snapshot
    var firstChildName = childParts.pop();
    snap = new NormalizedSnapshot(
      this._ref.child(firstChildName),
      this._rec.getChildSnaps(this._snaps, firstChildName)
    );
    // iterate any nested keys and keep calling child on them
    while(childParts.length) {
      snap = snap.child(childParts.pop());
    }
    return snap;
  },

  forEach: function(cb, context) {
    return this._rec.forEachKey(this._snaps, function(childId, childAlias) {
      if( childId === '$value' || childId === '$key' ) { return false; }
      return cb.call(context, this.child(childAlias));
    }, this);
  },

  hasChild: function(key) {
    //todo optimize and/or memoize?
    var parts = key.split('/').reverse();
    var res = parts.length > 0;
    var nextRef = this._ref;
    var nsnap = this;
    while(res && parts.length) {
      var nextKey = parts.pop();
      res = nextRef.$getRecord().hasChild(nsnap._snaps, nextKey);
      if( res && parts.length ) {
        nextRef = nextRef.child(nextKey);
        nsnap = nsnap.child(nextKey);
      }
    }
    return res;
  },

  /**
   * Returns true if this snapshot has any child data. Does not return true for $key or $value
   * fields.
   *
   * @returns {boolean}
   */
  hasChildren: function() {
    // if there are any keys to iterate, and that key is not $key or $value
    // then we have children
    return this._rec.forEachKey(this._snaps, function(id) {
      return id !== '$key' && id !== '$value';
    });
  },

  /** @deprecated */
  name: function() {
    console.warn('name() has been deprecated. Use key() instead.');
    return this.key();
  },

  key: function() {
    return this._rec.getName();
  },

  numChildren: function() {
    //todo-bug does not account for nested aliases (they will change the count here)
    var ct = 0;
    this._rec.forEachKey(this._snaps, function(id) {
      if( id !== '$key' && id !== '$value' ) { ct++; }
    });
    return ct;
  },

  ref: function() { return this._ref.ref(); },

  getPriority: function() { return this._pri; },

  exportVal: function() {
    return this._rec.mergeData(this._snaps, true);
  },

  exists: function() {
    return this.val() !== null;
  }
};

module.exports = NormalizedSnapshot;
},{"../../common":25}],9:[function(require,module,exports){
'use strict';

var util = require('../../common');

function Path(pathProps, parent) {
  var props = parseProps(pathProps);
  this._ref = props.ref;
  this._alias = props.alias;
  this._dep = props.dep;
  this._parent = parent || null;
}

Path.prototype = {
  ref: function() { return this._ref; },
  reff: function() { return this.ref().ref(); },
  child: function(key) {
    return new Path(this.reff().child(key), this);
  },
  normChild: function(key) {
    var dep = this.getDependency();
    if( dep !== null ) {
      return new Path([this.reff(), this.name(), dep.path+'.'+dep.field], this);
    }
    else {
      return new Path([this.reff().child(key), this.name()], this);
    }
  },
  hasDependency: function() {
    return this._dep !== null;
  },
  getDependency: function() {
    return this._dep;
  },
  url: function() { return this.reff().toString(); },
  name: function() { return this._alias; },
  id: function() { return this.reff().key(); },
  parent: function() { return this._parent; },
  clone: function() {
    return new Path([this._ref, this._alias, this._dep], this._parent);
  }
};

function parseProps(props) {
  var ref, alias, dep = null;
  if( util.isArray(props) ) {
    ref = props[0];
    alias = props[1];
    dep = props[2];
  }
  else if( util.isFunction(props.ref) ) {
    ref = props.ref();
  }
  else {
    ref = props;
  }
  return {
    ref: ref, alias: alias||ref.key(), dep: parseDep(dep)
  };
}

function parseDep(dep) {
  if(util.isObject(dep) ) {
    return dep;
  }
  else if( dep ) {
    var parts = dep.split('.');
    return { path: parts[0], field: parts[1] };
  }
  return null;
}

module.exports = Path;
},{"../../common":25}],10:[function(require,module,exports){
'use strict';

var Path = require('./Path');
var util = require('../../common');

function PathManager(paths) {
  this.paths = [];
  this.pathsByUrl = {};
  this.deps = {};
  this.pathNames = [];
  util.each(paths, this.add, this);
}

PathManager.prototype = {
  add: function(pathProps) {
    var path = pathProps instanceof Path? pathProps.clone() : new Path(pathProps);
    if( !this.paths.length && path.hasDependency() ) {
      throw new Error('The master path (i.e. the first) may not declare a dependency.' +
        ' Perhaps you have put the wrong path first in the list?');
    }
    if( util.has(this.pathsByUrl, path.url()) ) {
      throw new Error('Duplicate path: ' + path.url());
    }
    if( util.contains(this.pathNames, path.name()) ) {
      throw new Error('Duplicate path name. The .key() value for each path must be unique, or you ' +
          'can give each a path an alias by using [firebaseRef, alias] in the constructor. The aliases ' +
          'must also be unique.');
    }
    this._map(path);
    this.paths.push(path);
    this.pathsByUrl[path.url()] = path.name();
    this.pathNames.push(path.name());
  },

  count: function() {
    return this.paths.length;
  },

  first: function() {
    return this.paths[0];
  },

  getPath: function(pathName) {
    return util.find(this.paths, function(p) {
      return p.name() === pathName;
    })||null;
  },

  getPathFor: function(url) {
    var n = this.getPathName(url);
    return n? this.getPath(n) : null;
  },

  getPaths: function() {
    return this.paths.slice();
  },

  getPathName: function(url) {
    return this.pathsByUrl[url] || null;
  },

  getPathNames: function() {
    return this.pathNames.slice();
  },

  getUrls: function() {
    return util.keys(this.pathsByUrl);
  },

  //todo remove?
  getDependencyGraph: function() {
    return util.extend(true, this.deps);
  },

  _map: function(path) {
    var first = this.first();
    var dep = path.getDependency();
    if( !dep && first ) {
      dep = { path: first.name(), field: '$key' };
    }
    if( dep ) {
      this.deps[path.name()] = dep;
      this._assertNotCircularDep(path.name());
    }
  },

  _assertNotCircularDep: function(pathName) {
    var map = [pathName], dep = this.deps[pathName];
    while(util.isDefined(dep)) {
      var p = dep.path;
      if(util.contains(map, p)) {
        map.push(p); // adds it into the error message chain
        throw new Error('Circular dependencies in paths: ' + depChain(map, this.deps));
      }
      map.push(p);
      dep = util.val(this.deps, p);
    }
  }
};

function depChain(map, deps) {
  return util.map(map, function(p) {
    return deps[p].path + '.' + deps[p].field;
  }).join(' >> ');
}

module.exports = PathManager;
},{"../../common":25,"./Path":9}],11:[function(require,module,exports){
'use strict';

var util = require('../../common');
var Transmogrifier = require('./Transmogrifier');

function Query(ref, record) {
  var self = this;
  self._ref = ref;
  self._rec = record;
  // necessary because util.inherit() can only call classes with an empty constructor
  // so we can't depend on the params existing for that call
  if( record ) { record.setRef(self); } //todo don't like this here, is awkward coupling
}

Query.prototype = {
  'on': function(event, callback, cancel, context) {
    if( arguments.length === 3 && util.isObject(cancel) ) {
      context = cancel;
      cancel = util.undef;
    }

    function cancelHandler(err) {
      if( typeof(cancel) === 'function' && err !== null ) {
        cancel.call(context, err);
      }
    }

    this.$getRecord().watch(event, callback, cancelHandler, context);
    return callback;
  },

  'once': function(event, callback, cancel, context) {
    var self = this;
    if( arguments.length === 3 && util.isObject(cancel) ) {
      context = cancel;
      cancel = util.undef;
    }
    function successHandler(snap) {
      self.off(event, successHandler);
      callback.call(context, snap);
    }

    function cancelHandler(err) {
      if( typeof(cancel) === 'function' && err !== null ) {
        cancel.call(context, err);
      }
    }

    return this.on(event, successHandler, cancelHandler);
  },

  'off': function(event, callback, context) {
    this.$getRecord().unwatch(event, callback, context);
  },

  /************************************
   * Wrapped functions
   ************************************/

  'orderByChild': function() {
    return this.$replicate('orderByChild', util.toArray(arguments));
  },

  'orderByKey': function() {
    return this.$replicate('orderByKey', util.toArray(arguments));
  },

  'orderByValue': function() {
    return this.$replicate('orderByValue', util.toArray(arguments));
  },

  'orderByPriority': function() {
    return this.$replicate('orderByPriority', util.toArray(arguments));
  },

  'limitToFirst': function() {
    return this.$replicate('limitToFirst', util.toArray(arguments));
  },

  'limitToLast': function() {
    return this.$replicate('limitToLast', util.toArray(arguments));
  },

  /** @deprecated */
  'limit': function() {
    return this.$replicate('limit', util.toArray(arguments));
  },

  'startAt': function() {
    return this.$replicate('startAt', util.toArray(arguments));
  },

  'endAt': function() {
    return this.$replicate('endAt', util.toArray(arguments));
  },

  'equalTo': function() {
    return this.$replicate('equalTo', util.toArray(arguments));
  },

  'ref': function() { return this._ref; },

  /****************************
   * PACKAGE FUNCTIONS (not API)
   ***************************/

  /** @returns {Record} */
  '$getRecord': function() { return this._rec; },

  /** @return {Firebase} */
  '$getMaster': function() { return this._rec.getPathManager().first().ref(); },

  /** @return {Array} */
  '$getPaths': function() { return this._rec.getPathManager().getPaths(); },

  /**
   * @param {String} method
   * @param {Array|arguments} args
   * @returns {Query}
   */
  '$replicate': function(method, args) {
    var rec = this.$getRecord();
    var ref = this.$getMaster();
    ref = ref[method].apply(ref, args);
    return new Query(this._ref, Transmogrifier.replicate(rec, ref));
  }
};

util.registerFirebaseWrapper(Query);
module.exports = Query;
},{"../../common":25,"./Transmogrifier":17}],12:[function(require,module,exports){
'use strict';

var FieldMap           = require('./FieldMap');
var RecordField        = require('./RecordField');
var AbstractRecord     = require('./AbstractRecord');
var SnapshotFactory       = require('./SnapshotFactory');
var util               = require('../../common');

function Record(fieldMap) {
  var name = fieldMap.getPathManager().first().id();
  var url = util.mergeToString(fieldMap.getPathManager().getUrls());
  this._super(fieldMap, name, url);
  this._eventManagers = {};
  util.log.debug('Record created', this.getName(), this.getUrl());
}

util.inherits(Record, AbstractRecord, {
  makeChild: function(key) {
    var fm = FieldMap.fieldMap(this.getFieldMap(), key);
    return new RecordField(fm);
  },

  hasChild: function(snaps, key) {
    var field = this.getFieldMap().getField(key);
    if( !field ) { return false; }
    var snap = this.getFieldMap().snapFor(snaps, key);
    return snap !== null && snap.hasChild(key);
  },

  getChildSnaps: function(snaps, fieldName) {
    var child;
    var snap = this.getFieldMap().snapFor(snaps, fieldName);
    var field = this.getFieldMap().getField(fieldName);
    if( !field ) {
      child = snap.child(fieldName);
    }
    else {
      switch(field.id) {
        case '$key':
          throw new Error('Cannot get child snapshot from key (not a real child element)');
        case '$value':
          child = snap;
          break;
        default:
          child = snap.child(field.id);
      }
    }
    return [child];
  },

  /**
   * Given a list of snapshots to iterate, returns the valid keys
   * which exist in both the snapshots and the field map, in the
   * order they should be iterated.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: function(snaps, iterator, context) {
    function shouldIterate(snap, fieldId) {
      switch(fieldId) {
        case '$key':
          return true;
        case '$value':
          return snap && snap.val() !== null;
        default:
          return snap && snap.hasChild(fieldId);
      }
    }
    var map = this.getFieldMap();
    return map.forEach(function(field) {
      var snap = map.snapFor(snaps, field.alias);
      if( shouldIterate(snap, field.id) ) {
        return iterator.call(context, field.id, field.alias) === true;
      }
      return false;
    });
  },

  /**
   * Merge the data by iterating the snapshots in reverse order
   * so that keys from later paths do not overwrite keys from earlier paths
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    var data = null, map = this.getFieldMap();

    // if the master path is null, the record does not exist
    // so we do not add any data
    if( snaps.length > 0 && snaps[0].val() !== null ) {
      data = util.extend.apply(null, util.map(snaps, function(ss) {
        return map.extractData(ss, isExport);
      }));

      if( isExport && data !== null && snaps[0].getPriority() !== null ) {
        if( !util.isObject(data) ) {
          data = {'.value': data};
        }
        data['.priority'] = snaps[0].getPriority();
      }
    }

    return data;
  },

  getPriority: function(snaps) {
    return snaps[0].getPriority();
  },

  getClass: function() { return Record; },

  saveData: function(data, props) {
    var q = util.queue();
    var map = this.getFieldMap();
    var paths = this.getPathManager().getPaths();
    if( props.isUpdate && !util.isObject(data) ) {
      throw new Error('First argument to update() command must be an object');
    }
    if( data === null ) {
      util.each(paths, function(p) {
        if( !p.hasDependency() ) {
          p.reff().remove(q.getHandler());
        }
      });
    }
    else if(util.isObject(data)) {
      var denestedData = map.denest(data);
      util.each(denestedData, function(parts) {
        var path = parts.path;
        var dataForPath = parts.data;
        var ref = this._writeRef(denestedData, path);
        if( ref !== null ) {
          if( !util.isEmpty(dataForPath) || !props.isUpdate ) {
            if( !util.isObject(dataForPath) ) {
              dataForPath = {'.value': dataForPath};
            }
            if( !props.isUpdate ) {
              addEmptyFields(map, path, dataForPath);
            }
            if( util.isDefined(props.priority) ) {
              dataForPath['.priority'] = props.priority;
            }
            if( util.has(dataForPath, '.value') ) {
              ref.set(dataForPath, q.getHandler());
            }
            else {
              ref.update(dataForPath, q.getHandler());
            }
          }
        }
        else {
          util.log.info('No dynamic key found for master', paths[0].ref().toString(), 'with dynamic path', path.ref().toString());
        }
      }, this);
    }
    else if( paths.length === 1 ) {
      if( util.isDefined(props.priority) ) {
        paths[0].ref().setWithPriority(data, props.priority, q.getHandler());
      }
      else {
        paths[0].ref().set(data, q.getHandler());
      }
    }
    else {
      throw new Error('Cannot set multiple paths to a non-object value. ' +
        'Since this is a NormalizedCollection, the data will be split between the paths. ' +
        'But I can\'t split a primitive value');
    }
    q.handler(props.callback||util.noop, props.context);
  },

  getName: function() {
    return this._name;
  },

  getUrl: function() {
    return this._url;
  },

  _start: function(event) {
    if( !util.has(this._eventManagers, event) ) {
      util.log.debug('Record._start: event=%s, url=%s', event, this.getUrl());
      this._eventManagers[event] = event === 'value'?
        new ValueEventManager(this) : new ChildEventManager(event, this);
    }
    this._eventManagers[event].start();
  },

  _stop:   function(event) {
    if (util.has(this._eventManagers, event)) {
      util.log.debug('Record._stop: event=%s, url=%s', event, this.getUrl());
      this._eventManagers[event].stop();
    }
  },

  _writeRef: function(denestedData, path) {
    var ref = path.reff();
    var dep = path.getDependency();
    if( dep !== null ) {
      var depPath = this.getPathManager().getPath(dep.path);
      var key = this._depKey(denestedData, depPath, dep.field);
      ref = key === null? null : ref.child(key);
    }
    return ref;
  },

  _depKey: function(denestedData, path, fieldId) {
    var key;
    var dat = denestedData[path.name()].data;
    switch(fieldId) {
      case '$key':
        key = path.id();
        break;
      case '$value':
        key = util.has(dat, '.value')? dat['.value'] : util.isEmpty(dat)? null : dat;
        break;
      default:
        key = util.has(dat, fieldId)? dat[fieldId] : null;
    }
    var type = typeof key;
    if( key !== null && type !== 'string' ) {
      throw new Error(
          'Dynamic key values must be a string. Type was ' +
          type + ' for ' + path.ref().toString() + '->' + fieldId
      );
    }
    return key;
  }
});

function ValueEventManager(rec) {
  this.rec = rec;
  this.pm = rec.getPathManager();
  this.running = false;
  this._init();
}

ValueEventManager.prototype = {
  start: function() {
    if( !this.running ) {
      this.running = true;
      util.each(this.pm.getPathNames(), this._startPath, this);
    }
  },

  stop: function() {
    if( this.running ) {
      this.running = false;
      util.each(this.subs, function(fn) {
        fn();
      });
      this._init();
    }
  },

  update: function(pathName, snap) {
    this.snaps[pathName] = snap;
    this._checkLoadState();
    util.log('Record.ValueEventManager.update: url=%s, loadCompleted=%s', snap.ref().toString(), this.loadCompleted);
    if( this.loadCompleted ) {
      this.rec.trigger(new SnapshotFactory('value', this.rec.getName(), util.toArray(this.snaps)));
    }
  },

  _startPath: function(pathName) {
    var self = this;
    var path = self.pm.getPath(pathName);
    var fn = util.bind(self.update, self, pathName);
    if( path.hasDependency() ) {
      var dyno = new Dyno(path, this.rec.getFieldMap(), 'value', fn);
      this.subs.push(dyno.dispose);
    }
    else {
      path.ref().on('value', fn);
      self.subs.push(function() {
        path.ref().off('value', fn);
      });
    }
  },

  _checkLoadState: function() {
    if( this.loadCompleted ) { return; }
    var snaps = this.snaps;
    var pathNames = this.pm.getPathNames();
    this.loadCompleted = !util.contains(pathNames, function(p) {
      return !snaps.hasOwnProperty(p);
    });
  },

  _init: function() {
    this.loadCompleted = false;
    this.snaps = {};
    this.subs = [];
  }
};

function ChildEventManager(event, rec) {
  this.event = event;
  this.rec = rec;
  this.map = rec.getFieldMap();
  this.pm = rec.getPathManager();
  this.subs = [];
  this.dyno = null;
}

ChildEventManager.prototype = {
  start: function() {
    util.each(this.pm.getPathNames(), function(pathName) {
      var event = this.event;
      var path = this.pm.getPath(pathName);
      var fn = util.bind(this.update, this);
      if( path.hasDependency() ) {
        this.dyno = new Dyno(path, this.map, event, fn);
        this.subs.push(this.dyno.dispose);
      }
      else {
        path.ref().on(event, fn);
        this.subs.push(function() {
          path.ref().off(event, fn);
        });
      }
    }, this);
  },

  stop: function() {
    util.each(this.subs, function(fn) {
      fn();
    });
    this.subs = [];
  },

  update: function(snap, prev) {
    if( snap !== null && this.map.aliasFor(snap.ref().toString()) !== null ) {
      util.log('Record.ChildEventManager.update: event=%s, key=%s/%s', this.event, snap.ref().parent().key(), snap.key());
      this.rec.trigger(new SnapshotFactory(this.event, snap.key(), snap, prev));
    }
  }
};

/**
 * Process a path which depends on the value of another field. We have
 * to monitor the field it depends on for value events and update
 * the ref that we listen on whenever the id is modified.
 *
 * @param {Path} path
 * @param {FieldMap } fieldMap
 * @param {string} event
 * @param {function} updateFn
 * @constructor
 */
function Dyno(path, fieldMap, event, updateFn) {
  var dep = path.getDependency();
  var depPath = fieldMap.getPath(dep.path);
  var depRef = depPath.ref();
  if( dep.field === '$key' ) {
    throw new Error('Dynamic paths do not support $key (you should probably just join on this path)');
  }
  if( dep.field !== '$value' ) {
    depRef = depRef.child(dep.field);
  }
  var ref;

  // establish our listener at the field which contains the id of our ref
  var depFn = depRef.on('value', function(snap) {
    if( ref && ref.key() !== snap.val() ) {
      util.log.debug('Record.Dyno: stopped monitoring %s', ref.toString());
      // any time the id changes, remove the old listener
      ref.off(event, updateFn);
      updateFn(null);
    }
    if( snap.val() !== null ) {
      // establish our listener at the correct dynamic id for values
      ref = path.ref().child(snap.val());
      ref.on(event, updateFn);
      util.log('Record.Dyno: monitoring %s', ref.toString()); //debug
    }
  });

  // create a dispose method that can turn off all our event listeners
  // when _stop is called
  this.dispose = function() {
    depRef.off('value', depFn);
    if( ref ) {
      ref.off(event, updateFn);
    }
  };
}

function addEmptyFields(map, path, dataToSave) {
  util.each(map.fieldsFor(path.name()), function(f) {
    switch(f.id) {
      case '$key':
        // ignore key
        break;
      case '$value':
        if( !util.has(dataToSave, '.value') ) {
          dataToSave['.value'] = null;
        }
        break;
      default:
        if( !util.has(dataToSave, f.id) ) {
          dataToSave[f.id] = null;
        }
    }
  });
}

module.exports = Record;
},{"../../common":25,"./AbstractRecord":3,"./FieldMap":4,"./RecordField":13,"./SnapshotFactory":16}],13:[function(require,module,exports){
'use strict';

var PathManager        = require('./PathManager');
var FieldMap           = require('./FieldMap');
var AbstractRecord     = require('./AbstractRecord');
var SnapshotFactory       = require('./SnapshotFactory');
var util               = require('../../common');

function RecordField(fieldMap) {
  this.handlers = {};
  this.path = fieldMap.getPathManager().first();
  this._super(fieldMap, this.path.name(), this.path.url());
  if( fieldMap.getPathManager().count() !== 1 ) {
    throw new Error('RecordField must have exactly one path, but we got '+ fieldMap.getPathManager().count());
  }
  if( fieldMap.length !== 1 ) {
    throw new Error('RecordField must have exactly one field, but we found '+ fieldMap.length);
  }
  util.log.debug('RecordField created', this.getName(), this.getUrl());
}

util.inherits(RecordField, AbstractRecord, {
  makeChild: function(key) {
    var pm = new PathManager([this.path.child(key)]);
    var fm = new FieldMap(pm);
    fm.add({key: FieldMap.key(pm.first(), '$value'), alias: key});
    return new RecordField(fm);
  },

  hasChild: function(snaps, key) {
    return snaps[0].hasChild(key);
  },

  getChildSnaps: function(snaps, fieldName) {
    // there is exactly one snap and there are no aliases to deal with
    return [snaps[0].child(fieldName)];
  },

  /**
   * There is nothing to merge at this level because there is only one
   * path and no field map
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    return isExport? snaps[0].exportVal() : snaps[0].val();
  },

  getPriority: function(snaps) {
    return snaps[0].getPriority();
  },

  /**
   * Iterates all keys of snapshot.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: function(snaps, iterator, context) {
    var firstSnap = snaps[0];
    return firstSnap.forEach(function(ss) {
      iterator.call(context, ss.key(), ss.key());
    });
  },

  saveData: function(data, opts) {
    var ref = this.path.ref();
    if( opts.isUpdate ) {
      if( !util.isObject(data) ) {
        throw new Error('When using update(), the data must be an object.');
      }
      if( util.has(opts, 'priority') ) {
        data['.priority'] = opts.priority;
      }
      ref.update(data, wrapCallback(opts));
    }
    else if( util.has(opts, 'priority') ) {
      ref.setWithPriority(data, opts.priority, wrapCallback(opts));
    }
    else {
      ref.set(data, wrapCallback(opts));
    }
  },

  getClass: function() { return RecordField; },

  _start: function(event) {
    var self = this;
    this.handlers[event] = function(snap, prev) {
      self.trigger(new SnapshotFactory(event, snap.key(), snap, prev));
    };
    this.path.ref().on(event, this.handlers[event], this._cancel, this);
  },

  _stop:   function(event) {
    if( this.handlers.hasOwnProperty(event) ) {
      this.path.ref().off(event, this.handlers[event], this);
    }
  }
});

function wrapCallback(opts) {
  if( opts.callback ) {
    return function() {
      opts.callback.apply(opts.context, arguments);
    };
  }
  else {
    return util.noop;
  }
}

module.exports = RecordField;
},{"../../common":25,"./AbstractRecord":3,"./FieldMap":4,"./PathManager":10,"./SnapshotFactory":16}],14:[function(require,module,exports){
'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');
var FieldMap = require('./FieldMap');
var RecordSetEventManager = require('./RecordSetEventManager');

/**
 * A "Record" (see AbstractRecord) represents a merged set of data used by NormalizedRef.
 * It is used by NormalizedRef to create snapshots and monitor Firebase for data changes.
 *
 * A RecordSet represents the root level of NormalizedCollection's output. It is a list of
 * collections (from multiple paths in Firebase) to be joined together.
 *
 * This is, for the purposes of a NormalizedCollections, the root of the data. Calls to parent()
 * from here should return null, just like they would from the root of a Firebase. This is because
 * the parent of a normalized collection is ambiguous, so there is no higher level of data.
 *
 * @param fieldMap this is the field map to be applied to each Record created when calling child()
 * @param whereClause this filters the output data and events
 * @constructor
 */
function RecordSet(fieldMap, whereClause) {
  var name = util.mergeToString(fieldMap.getPathManager().getPathNames());
  var url = util.mergeToString(fieldMap.getPathManager().getUrls());

  // AbstractRecord makes this observable and abstracts some common impl details
  // between RecordSet, Record, and RecordField
  this._super(fieldMap, name, url);

  // Used to filter the merged data and determine which merged Records should trigger events and
  // which ones should be ignored
  this.filters = whereClause;

  // the RecordSetEventManager handles Firebase events and calls event handlers on
  // this RecordSet appropriately. See RecordSetEventManager for more details
  this.monitor = new RecordSetEventManager(this);
}

util.inherits(RecordSet, AbstractRecord, {
  makeChild: function(key) {
    var fm = FieldMap.recordMap(this.getFieldMap(), key);
    return new Record(fm);
  },

  /**
   * Override AbstractRecord's hasChild since we are dealing
   * with record ids at this level. We use the master list to determine
   * if records exist, so it's a pretty straightforward hasChild
   * on the first snapshot.
   *
   * @param {Array} snaps a list of array snapshots to test for child
   * @param {string} key
   */
  hasChild: function(snaps, key) {
    return util.contains(snaps, function(s) {
      return s.key() === key;
    });
  },

  getChildSnaps: function(snapsArray, recordId) {
    return util.filter(snapsArray, function(s) {
      return s.key() === recordId;
    });
  },

  /**
   * Since the snapshots attached to this level are records, there isn't much
   * to do for a merge. Just put them all together.
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    var self = this, out = null;
    // if the master path is empty, there is no data to be merged
    if( snaps.length && snaps[0].val() !== null ) {
      out = {};
      util.each(snaps, function(snap) {
        if( snap.val() !== null && self.filters.test(snap.val(), snap.key(), snap.getPriority()) ) {
          out[snap.key()] = isExport? snap.exportVal() : snap.val();
        }
      });
    }
    return out;
  },

  getPriority: function() {
    return null;
  },

  /**
   * Given a list of snapshots to iterate, returns the valid keys
   * which exist in both the snapshots and the field map, in the
   * order they should be iterated.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: function(snaps, iterator, context) {
    snaps.forEach(function(snap) {
      return iterator.call(context, snap.key(), snap.key());
    });
  },

  getClass: function() { return RecordSet; },

  /**
   * Saving a record set is done by grabbing each child record and calling save against that.
   * This is the easiest approach since we must distribute fields to each appropriate path.
   * It might be more efficient to bulk these into a single write op, and perhaps we should
   * explore that if this proves to be slow.
   *
   * @param data
   * @param {Object} opts
   */
  saveData: function(data, opts) {
    var q = util.queue();
    if( data === null ) {
      util.each(this.getPathManager().getPaths(), function(path) {
        path.ref().remove(q.getHandler());
      });
    }
    else if( !util.isObject(data) ) {
      throw new Error('Calls to set() or update() on a NormalizedCollection must pass either ' +
          'null or an object value. There is no way to split a primitive value between the paths');
    }
    else {
      util.each(data, function(v, k) {
        if( k === '.value' || k === '.priority' ) {
          throw new Error('Cannot use .priority or .value on the root path of a NormalizedCollection. ' +
              'You probably meant to sort the records anyway (i.e. one level lower).');
        }
        this.child(k).saveData(v, {isUpdate: opts.isUpdate, callback: q.getHandler()});
      }, this);
      if( opts.priority ) {
        this.getPathManager().first().ref().setPriority(opts.priority, q.getHandler());
      }
    }
    q.handler(opts.callback||util.noop, opts.context);
  },

  /**
   * Return the correct child key for a snapshot by determining if its corresponding path
   * has dependencies. If so, we look up the id and return that child, otherwise, we just
   * return the child for the recordId.
   *
   * If a dependency exists, but the required field is null or invalid, then we just return
   * null in place of the snapshot.
   *
   * @private
   */
  _getChildKey: function(snap, snapsArray, recordId) {
    var key = recordId;
    var path = this.getPathManager().getPathFor(snap.ref().toString());
    // resolve any dependencies to determine the child key's value
    if( path.hasDependency() ) {
      var dep = path.getDependency();
      var depPath = this.getFieldMap().getPath(dep.path);
      if( !depPath ) {
        throw new Error('Invalid dependency path. ' + snap.ref.toString() +
        ' depends on ' + dep.path +
        ', but that alias does not exist in the paths provided.');
      }
      var depSnap = util.find(snapsArray, function(snap) {
        return snap.ref().toString() === depPath.url();
      });
      if( depSnap ) {
        depSnap = depSnap.child(recordId);
        if( dep.field !== '$value' ) {
          depSnap = depSnap.child(dep.field);
        }
        key = depSnap.val();
      }
      else {
        key = null;
      }
    }
    return key;
  },

  _start: function() {
    this.monitor.start();
  },

  _stop:   function(event, count) {
    if( count === 0 ) { this.monitor.stop(); }
  }
});

module.exports = RecordSet;
},{"../../common":25,"./AbstractRecord":3,"./FieldMap":4,"./Record":12,"./RecordSetEventManager":15}],15:[function(require,module,exports){
'use strict';

var SnapshotFactory = require('./SnapshotFactory');
var util = require('../../common');

/**
 * Monitors the references attached to a RecordSet and maintains a cache of
 * current snapshots (inside RecordList below). Any time there is an update, this calls
 * RecordSet.trigger() to notify event listeners.
 *
 * @param parentRec
 * @constructor
 */
function RecordSetEventManager(parentRec) {
  var pm = parentRec.getPathManager();
  this.masterRef = pm.first().ref();
  this.url = this.masterRef.toString();
  this.recList = new RecordList(parentRec, this.url);
  this.running = false;
}

RecordSetEventManager.prototype = {
  start: function() {
    if( !this.running ) {
      util.log('RecordSetEventManager: Loading normalized records from master list %s', this.url);
      this.running = true;
      this.masterRef.on('child_added',   this._add,    this);
      this.masterRef.on('child_removed', this._remove, this);
      this.masterRef.on('child_moved',   this._move,   this);
      // make sure all existing keys are loaded into memory before we let recList trigger value events
      this.masterRef.once('value', this.recList.masterPathLoaded, this.recList);
    }
    return this;
  },

  stop: function() {
    if( this.running ) {
      util.log('RecordSetEventManager: Stopped monitoring master list %s', this.url);
      this.running = false;
      this.masterRef.off('child_added',   this._add,    this);
      this.masterRef.off('child_removed', this._remove, this);
      this.masterRef.off('child_moved',   this._move,   this);
      this.recList.unloaded();
    }
    return this;
  },

  _add: function(snap, prevChild) {
    this.recList.add(snap.key(), prevChild);
  },

  _remove: function(snap) {
    this.recList.remove(snap.key());
  },

  _move: function(snap, prevChild) {
    this.recList.move(snap.key(), prevChild);
  }
};

function RecordList(observable, url) {
  this.obs = observable;
  this.url = url;
  this._reset();
}

RecordList.prototype = {
  add: function(key, prevChild) {
    util.log.debug('RecordList.add: key=%s, prevChild=%s', key, prevChild);
    var rec = this.obs.child(key);
    var fn = util.bind(this._valueUpdated, this, key);
    this.loading[key] = {rec: rec, prev: prevChild, fn: fn, unwatch: function() { rec.unwatch('value', fn); }};
    if( !this.loadComplete ) {
      this.initialKeysLeft.push(key);
    }
    rec.watch('value', fn);
  },

  remove: function(key) {
    util.log.debug('RecordList.remove: key=%s', key);
    var oldSnap = this._dropRecord(key);
    if( oldSnap !== null ) {
      this._notify('child_removed', key, oldSnap);
    }
  },

  move: function(key, prevChild) {
    if(util.has(this.recs, key)) {
      var currPos = util.indexOf(this.recIds, key);
      this.recIds.splice(currPos, 1);
      this._putAfter(key, prevChild);
      this._notify('child_moved', key);
    }
  },

  masterPathLoaded: function() {
    util.log.debug('RecordList: Initial data has been loaded from master list at %s', this.url);
    this.masterLoaded = true;
    if( this._checkLoadState() ) {
      this._notifyValue();
    }
  },

  unloaded: function() {
    this._reset();
  },

  findKey: function(key) {
    return util.indexOf(this.recIds, key);
  },

  _reset: function() {
    util.each(this.recs, function(rec, key) {
      this.remove(key);
    }, this);
    util.each(this.filtered, function(rec, key) {
      this._dropRecord(key);
    }, this);
    util.each(this.loading, function(rec, key) {
      this._dropRecord(key);
    }, this);
    this.recs = {};
    this.recIds = [];
    this.snaps = {};
    this.loading = {};
    this.filtered = {};
    this.loadComplete = false;
    this.initialKeysLeft = [];
    this.masterLoaded = false;
  },

  _valueUpdated: function(key, snap) {
    var rec;
    this.snaps[key] = snap;
    if(util.has(this.loading, key)) {
      // record has finished loading and merging paths
      rec = this.loading[key];
      delete this.loading[key];
      this._processAdd(snap, rec);
    }
    else if(util.has(this.recs, key)) {
      rec = this.recs[key];
      this._processChange(snap, rec);
    }
    else if(util.has(this.filtered, key)) {
      if( snap.val() !== null && this.obs.filters.test(snap.val(), key, snap.getPriority()) ) {
        // the record data has changed and it is no longer part of the filtered
        // content, so treat it as a newly added record
        rec = this.filtered[key];
        delete this.filtered[key];
        util.log('RecordList: Unfiltered key %s', key);
        this._processAdd(snap, rec);
      }
    }
    else {
      util.log('RecordList: Orphan key %s ignored. Probably a concurrent edit.', key);
    }
  },

  _processAdd: function(snap, rec) {
    var key = snap.key();
    if( this.obs.filters.test(snap.val(), key, snap.getPriority()) ) {
      this.recs[key] = rec;
      this._putAfter(key, rec.prev);
      this._notify('child_added', key);
    }
    else {
      util.log('RecordList: Filtered key %s', key);
      this.filtered[key] = rec;
    }
    if( this._checkLoadState(key) ) {
      this._notifyValue();
    }
  },

  _processChange: function(snap, rec) {
    // null records are valid at the record level and can trigger value events, but at
    // the Set level, they mean the record is in the process of being deleted so we
    // ignore the value event here
    if( snap.val() !== null ) {
      var key = snap.key();
      if( this.obs.filters.test(snap.val(), key, snap.getPriority()) ) {
        // a changed record that has not been filtered
        this._notify('child_changed', key);
      }
      else {
        // record changes caused it to become filtered, so treat it as a removed rec
        // however, we'll continue to watch it for changes so it can be unfiltered later
        delete this.recs[key];
        this.filtered[key] = rec;
        this._notify('child_removed', key, this.snaps[key]);
      }
    }
  },

  _notify: function(event, key, oldSnap) {
    var prev;
    if( event === 'child_added' || event === 'child_moved' ) {
      prev = this._getPrevChild(key);
    }
    util.log('RecordList._notify: event=%s, key=%s, prev=%s', event, key, prev);
    var factory = new SnapshotFactory(event, key, oldSnap||this.snaps[key], prev);
    this.obs.trigger(factory);
    this._notifyValue();
  },

  _notifyValue: function() {
    if( this.loadComplete ) {
      util.log.debug('RecordList._notifyValue: snap_keys=%s', util.keys(this.snaps));
      var factory = new SnapshotFactory('value', null, util.toArray(this.snaps));
      this.obs.trigger(factory);
    }
  },

  _getPrevChild: function(key) {
    if( !this.recIds.length ) { return null; }
    var pos = this.findKey(key);
    if( pos === -1 ) {
      return this.recIds[this.recIds.length-1];
    }
    else if( pos === 0 ) {
      return null;
    }
    else {
      return this.recIds[pos-1];
    }
  },

  _posFor: function(prevKey) {
    var pos, x;
    if( prevKey === null ) {
      pos = 0;
    }
    else {
      x = this.findKey(prevKey);
      pos = x === -1? this.recIds.length : x+1;
    }
    return pos;
  },

  _putAfter: function(key, prevChild) {
    var newPos = this._posFor(prevChild);
    this.recIds.splice(newPos, 0, key);
  },

  _dropRecord: function(key) {
    var res = null;
    if(this.recs[key]) {
      res = this.snaps[key];
      this.recs[key].unwatch();
    }
    if(this.loading[key]) {
      this.loading[key].unwatch();
    }
    if(util.has(this.filtered, key)) {
      this.filtered[key].unwatch();
    }
    delete this.loading[key];
    delete this.snaps[key];
    delete this.filtered[key];
    delete this.recs[key];
    util.remove(this.recIds, key);
    return res;
  },

  /**
   * Because the initial once('value') will probably trigger before all the child paths
   * are retrieved (remember that we are monitoring multiple paths per child), we need
   * to wait for them to load in before triggering our first value event.
   * @private
   */
  _checkLoadState: function(key) {
    if( !this.loadComplete ) {
      if( key ) {
        util.remove(this.initialKeysLeft, key);
      }
      if( !this.initialKeysLeft.length && this.masterLoaded ) {
        this.loadComplete = true;
        return true;
      }
    }
    return false;
  }
};

module.exports = RecordSetEventManager;
},{"../../common":25,"./SnapshotFactory":16}],16:[function(require,module,exports){

'use strict';

var util = require('../../common');
var NormalizedSnapshot = require('./NormalizedSnapshot.js');

function SnapshotFactory(event, key, snaps, prevChild) {
  this.event = event;
  this.key = key;
  this.snaps = unwrapSnapshots(snaps);
  this.prevChild = prevChild;
  assertValidTrigger(this);
}

SnapshotFactory.prototype.create = function(ref) {
  var snapshot;
  if( this.event === 'value' ) {
    snapshot = new NormalizedSnapshot(ref, this.snaps);
  }
  else {
    snapshot = new NormalizedSnapshot(ref.ref().child(this.key), this.snaps);
  }
  return snapshot;
};

SnapshotFactory.prototype.toString = function() {
  return util.printf(
    'SnapshotFactory(event=%s, key=%s, numberOfSnapshots=%s, prevChild=%s',
    this.event, this.key, this.snaps.length, this.prevChild === util.undef? 'undefined' : this.prevChild
  );
};

function assertValidTrigger(trigger) {
  switch(trigger.event) {
    case 'value':
      break;
    case 'child_added':
    case 'child_moved':
      if( typeof trigger.key !== 'string' || !trigger.key ) {
        throw new Error('Invalid trigger key ' + trigger.key);
      }
      if( trigger.prevChild === util.undef ) {
        throw new Error('Triggers must provide a valid prevChild value for child_added and child_moved events');
      }
      break;
    case 'child_removed':
    case 'child_changed':
      if( typeof trigger.key !== 'string' || !trigger.key ) {
        throw new Error('Invalid trigger key ' + trigger.key);
      }
      break;
    default:
      throw new Error('Invalid trigger event type: ' + trigger.event);
  }
}

function unwrapSnapshots(snaps) {
  if( snaps instanceof NormalizedSnapshot ) {
    return snaps._snaps.slice();
  }
  if( !util.isArray(snaps) ) {
    return [snaps];
  }
  return snaps.slice();
}

module.exports = SnapshotFactory;
},{"../../common":25,"./NormalizedSnapshot.js":8}],17:[function(require,module,exports){
'use strict';

var util        = require('../../common');
var PathManager = require('./PathManager');
var Path        = require('./Path');
var FieldMap    = require('./FieldMap');
var RecordSet   = require('./RecordSet');

module.exports = {
  replicate: function(record, newMasterRef) {
    // create a new set of paths
    var paths = record.getPathManager().getPaths().slice(0);
    var firstPath = paths[0];
    paths[0] = new Path([newMasterRef, firstPath.name(), firstPath.getDependency()]);
    var mgr = new PathManager(util.map(paths, function(p) { return p.clone(); }));

    // create a new field map from the updated paths
    var fieldMap = new FieldMap(mgr);
    record.getFieldMap().forEach(fieldMap.add, fieldMap);

    // recreate the AbstractRecord instance
    var Clazz = record.getClass();
    var rec;
    if( Clazz === RecordSet ) {
      rec = new Clazz(fieldMap, record.filters);
    }
    else {
      rec = new Clazz(fieldMap);
    }

    // done!
    return rec;
  }
};
},{"../../common":25,"./FieldMap":4,"./Path":9,"./PathManager":10,"./RecordSet":14}],18:[function(require,module,exports){
'use strict';
var util = require('../common');
var Scroll = require('./libs/Scroll.js');
var Paginate = require('./libs/Paginate.js');
var ReadOnlyRef = require('./libs/ReadOnlyRef.js');

var DEFAULTS = {
  field: null,
  pageSize: 10,
  windowSize: 250
};

exports.Scroll = function(baseRef, sortField, opts) {
  if( !util.isFirebaseRef(baseRef) || util.isQueryRef(baseRef) ) {
    throw new Error('First argument to Firebase.util.Scroll must be a valid Firebase ref. It cannot be a Query (e.g. you have called orderByChild()).');
  }

  if( typeof sortField !== 'string' ) {
    throw new Error('Second argument to Firebase.util.Scroll must be a valid string');
  }
  if( arguments.length > 2 && !util.isObject(opts) ) {
    throw new Error('Optional third argument to Firebase.util.Scroll must be an object of key/value pairs');
  }
  var ref = new ReadOnlyRef(baseRef);
  ref.scroll = new Scroll(ref, sortField, calcOpts(opts, 'windowSize', 'Scroll'));
  return ref;
};

exports.Paginate = function(baseRef, sortField, opts) {
  if( !util.isFirebaseRef(baseRef) || util.isQueryRef(baseRef) ) {
    throw new Error('First argument to Firebase.util.Paginate must be a valid Firebase ref. It cannot be a Query (e.g. you have called orderByChild()).');
  }
  if( typeof sortField !== 'string' ) {
    throw new Error('Second argument to Firebase.util.Paginate must be a valid string');
  }
  if( arguments.length > 2 && !util.isObject(opts) ) {
    throw new Error('Optional third argument to Firebase.util.Paginate must be an object of key/value pairs');
  }
  var ref = new ReadOnlyRef(baseRef);
  ref.page = new Paginate(ref, sortField, calcOpts(opts, 'pageSize', 'Paginate'));
  return ref;
};

function calcOpts(opts, maxFromKey, method) {
  var res = util.extend({}, DEFAULTS, opts);
  if( !res.maxCacheSize ) {
    res.maxCacheSize = res[maxFromKey] * 3;
  }
  assertNumber(res, maxFromKey, method);
  assertNumber(res, 'maxCacheSize', method);
  return res;
}

function assertNumber(obj, key, method) {
  if( typeof obj[key] !== 'number' ) {
    throw new Error('Argument ' + key + ' passed into opts for ' + method + 'must be a number' );
  }
}
},{"../common":25,"./libs/Paginate.js":21,"./libs/ReadOnlyRef.js":22,"./libs/Scroll.js":23}],19:[function(require,module,exports){
'use strict';
var util = require('../../common');
var Offset = require('./Offset');

function Cache(outRef, sortField, maxRecordsLoaded) {
  util.log.debug('Cache: caching %s using field=%s maxRecordsLoaded=%d', outRef.toString(), sortField, maxRecordsLoaded);
  this.offset = new Offset({field: sortField, max: maxRecordsLoaded, ref: outRef.ref()});
  this.outRef = outRef;
  this.inRef = null;
  this.queryRef = null;
  this.countRef = null;
  this.keys = {};
  this.start = 0;
  this.count = -1;
  this.endCount = -1;
  this.nextListeners = [];
  this.offset.observe(this._keyChange, this);
}

Cache.prototype.moveTo = function(startOffset, numberOfRecords) {
  util.log.debug('Cache.moveTo: startOffset=%d, numberOfRecords=%d', startOffset, numberOfRecords);
  var s = this.start, e = this.count;
  this.start = startOffset;
  this.count = numberOfRecords;
  this.endCount = this.start + this.count;
  if( s !== this.start ) {
    this.offset.goTo(startOffset, numberOfRecords);
  }
  else if( e !== this.count ) {
    this._refChange();
  }
};

Cache.prototype.hasNext = function() {
  return this.count === -1 || this.endCount > this.start + this.count;
};

Cache.prototype.hasPrev = function() {
  return this.start > 0;
};

Cache.prototype.observeHasNext = function(callback, context) {
  var list = this.nextListeners;
  var parts = [callback, context];
  list.push(parts);
  return function() {
    util.remove(list, parts);
  };
};

Cache.prototype.destroy = function() {
  this._unsubscribe();
  this.offset.destroy();
  this.offset = null;
  this.start = 0;
  this.count = -1;
  this.inRef = null;
  this.outRef = null;
  this.queryRef = null;
  this.countRef = null;
  this.keys = null;
  this.nextListeners = null;
};

Cache.prototype._keyChange = function(val, key, ref) {
  this.inRef = ref;
  util.log.debug('Cache._keyChange: %s %s %s', val, key, ref.toString());
  this._refChange();
};

Cache.prototype._unsubscribe = function() {
  if( this.queryRef ) {
    this.queryRef.off('child_added', this._add, this);
    this.queryRef.off('child_removed', this._remove, this);
    this.queryRef.off('child_moved', this._move, this);
    this.queryRef.off('child_changed', this._change, this);
    this.queryRef.off('value', this._value, this);
    this.queryRef.off('value', this._removeOrphans, this);
    this.queryRef = null;
  }
  if( this.countRef ) {
    this.countRef.off('value', this._count, this);
    this.countRef = null;
  }
};

Cache.prototype._refChange = function() {
  this._unsubscribe();
  if( this.inRef && this.count > -1 ) {
    this.countRef = this.inRef.limitToFirst(this.count+1);
    this.countRef.on('value', this._count, this);
    //todo we should queue all the events until the once('value') is completed
    //todo so that we can trigger removed before added
    this.queryRef = this.inRef.limitToFirst(this.count);
    this.queryRef.on('child_added', this._add, this);
    this.queryRef.on('child_removed', this._remove, this);
    this.queryRef.on('child_moved', this._move, this);
    this.queryRef.on('child_changed', this._change, this);
    this.queryRef.on('value', this._value, this);
    this.queryRef.once('value', this._removeOrphans, this);
  }
};

Cache.prototype._add = function(snap, prevChild) {
  var key = snap.key();
  if( !util.has(this.keys, key) ) {
    this.keys[key] = snap;
    this.outRef.$trigger('child_added', snap, prevChild);
  }
  else if( !util.isEqual(this.keys[key], snap.val()) ) {
    this._change(snap);
  }
};

Cache.prototype._remove = function(snap) {
  var key = snap.key();
  if( util.has(this.keys, key) ) {
    this.outRef.$trigger('child_removed', snap);
    delete this.keys[key];
  }
};

Cache.prototype._move = function(snap, prevChild) {
  var key = snap.key();
  if( util.has(this.keys, key) ) {
    this.keys[key] = snap;
    this.outRef.$trigger('child_moved', snap, prevChild);
  }
};

Cache.prototype._change = function(snap) {
  this.keys[snap.key()] = snap;
  this.outRef.$trigger('child_changed', snap);
};

Cache.prototype._value = function(snap) {
  this.outRef.$trigger('value', snap);
};

Cache.prototype._count = function(snap) {
  this.endCount = this.start + snap.numChildren();
  var hasNext = this.hasNext();
  util.each(this.nextListeners, function(parts) {
    parts[0].call(parts[1], hasNext);
  });
};

Cache.prototype._removeOrphans = function(valueSnap) {
  util.each(this.keys, function(cachedSnap, key) {
    if( !valueSnap.hasChild(key) ) {
      this.outRef.$trigger('child_removed', cachedSnap);
      delete this.keys[key];
    }
  }, this);
};

module.exports = Cache;
},{"../../common":25,"./Offset":20}],20:[function(require,module,exports){
'use strict';
var util = require('../../common');

function Offset(opts) {
  this.keys = [];
  this.field = opts.field;
  this.ref = baseRef(opts.ref, opts.field);
  this.max = opts.max;
  this.listeners = [];
  this.curr = 0;
  this.sub = null;
  this.isSubscribing = false;
  this.lastNotifyValue = util.undef;
  this._debouncedRecache = debounce(function() {
    util.log.debug('Offset._debouncedRecache: recaching keys for offset %d', this.curr);
    this.keys = [];
    this._grow(this._listen);
  }, this, 100, 1000);
}

Offset.prototype.goTo = function(newOffset) {
  if( newOffset !== this.curr ) {
    util.log('Offset.goTo: offset changed from %d to %d', this.curr, newOffset);
    this.curr = newOffset;
    this.lastNotifyValue = util.undef;
    this._listen();
  }
};

Offset.prototype.observe = function(callback, context) {
  this.listeners.push([callback, context]);
  var key = this.getKey();
  var ref = offsetRef(this.ref, key);
  callback.call(context, key && key.val, key && key.key, ref);
};

Offset.prototype.getKey = function(offset) {
  if( !arguments.length ) { offset = this.curr; }
  if( offset === 0 ) { return null; }
  return this.keys.length > offset && this.keys[offset];
};

Offset.prototype.destroy = function() {
  this._unsubscribe();
  this.curr = 0;
  this.keys = [];
  this.lastNotifyValue = util.undef;
  this.isSubscribing = false;
};

Offset.prototype._notify = function() {
  var key = this.getKey();
  if( !util.isEqual(this.lastNotifyValue, key) ) {
    util.log('Offset._notify: key at offset %d is %s', this.curr, key && key.key);
    this.lastNotifyValue = key;
    var ref = offsetRef(this.ref, key);
    util.each(this.listeners, function(parts) {
      parts[0].call(parts[1], key && key.val, key && key.key, ref);
    });
  }
};

Offset.prototype._recache = function() {
  if( !this.isSubscribing ) {
    this._debouncedRecache();
  }
};

var killCount = 0;
Offset.prototype._grow = function(callback) {
  var self = this;
  var len = self.keys.length;
  if( self.curr >= len ) {
    var oldKey = self.getKey();
    var startAt = lastKey(self.keys);
    var limit = Math.min(self.curr + (startAt? 2 : 1) - len, self.max);
    var ref = startAt !== null? self.ref.startAt(startAt.val, startAt.key) : self.ref;
    ref.limitToFirst(limit).once('value', function(snap) {
      var skipFirst = startAt !== null;
      snap.forEach(function(ss) {
        if( skipFirst ) {
          skipFirst = false;
          return;
        }
        self.keys.push(extractKey(ss, self.field));
      });
      if( killCount++ > 10000 ) {
        throw new Error('Tried to fetch more than 10,000 pages to determine the correct offset. Giving up now. Sorry.');
      }
      if( self.curr >= self.keys.length && snap.numChildren() === limit ) {
        // prevents recursive scoping
        setTimeout(util.bind(self._grow, self, callback), 0);
      }
      else {
        killCount = 0;
        util.log.debug('Offset._grow: Cached %d keys', self.keys.length);
        callback.call(self, !util.isEqual(self.getKey(), oldKey));
      }
    });
  }
  else {
    callback.call(self, false);
  }
};

Offset.prototype._startOffset = function() {
  return Math.max(0, this.curr - this.max, this.curr - 10);
};

Offset.prototype._queryRef = function() {
  var start = this._startOffset();
  var ref = this.ref;
  if( start > 0 ) {
    var key = this.getKey(start);
    ref = ref.startAt(key.val, key.key);
  }
  return ref.limitToLast(Math.max(this.curr - start, 1));
};

Offset.prototype._moved = function(snap) {
  if( snap.key() === this.getKey() ) {
    this._recache();
  }
};

Offset.prototype._unsubscribe = function() {
  if( this.sub ) {
    this.sub.off('child_added', this._recache, this);
    this.sub.off('child_moved', this._moved, this);
    this.sub.off('child_removed', this._recache, this);
    this.sub.off('value', this._doneSubscribing, this);
    this.sub = null;
  }
};

Offset.prototype._subscribe = function() {
  this._unsubscribe();
  this.sub = this._queryRef();
  this.isSubscribing = true;
  this.sub.on('child_added', this._recache, this);
  this.sub.on('child_moved', this._moved, this);
  this.sub.on('child_removed', this._recache, this);
  this.sub.once('value', this._doneSubscribing, this);
};

Offset.prototype._doneSubscribing = function() {
  this.isSubscribing = false;
  this._notify();
};

Offset.prototype._monitorEmptyOffset = function() {
  function fn(snap) {
    var count = snap.numChildren();
    if( count > (key === null? 0 : 1) ) {
      util.log.debug('Offset._monitorEmptyOffset: A value exists now.');
      ref.off('value', fn);
      self._grow();
    }
  }
  var self = this;
  var ref = self.ref;
  var key = null;
  if( this.keys.length ) {
    key = lastKey(this.keys);
    ref = ref.startAt(key.val, key.key);
  }
  util.log.debug('Offset._monitorEmptyOffset: No value exists at offset %d, currently %d keys at this path. Watching for a new value.', this.curr, this.keys.length);
  ref.limitToFirst(2).on('value', fn);
};

Offset.prototype._listen = function() {
  this._unsubscribe();
  if( this.curr >= this.keys.length ) {
    this._grow(function(/*changed*/) {
      if( this.keys.length >= this.curr ) {
        this._subscribe();
      }
      else {
        this._monitorEmptyOffset();
        this._notify();
      }
    });
  }
  else {
    this._subscribe();
  }
};

function extractKey(snap, field) {
  var v;
  switch(field) {
    case '$key':
      v = snap.key();
      break;
    case '$priority':
      v = snap.getPriority();
      break;
    case '$value':
      v = snap.val();
      break;
    default:
      var obj = snap.val();
      if( !util.isObject(obj) ) {
        throw new Error('A value of type ' + typeof obj + 'Was found. ' +
        'But we are attempting to order by child field "' + field + '". ' +
        'Pagination requires all records to be objects or it can\'t determine an ' +
        'appropriate offset value.');
      }
      else {
        v = obj[field];
      }
  }
  return {val: v, key: snap.key()};
}

function offsetRef(baseRef, startKey) {
  if( startKey === false ) {
    return null;
  }
  else if( startKey === null ) {
    return baseRef;
  }
  else {
    return baseRef.startAt(startKey.val, startKey.key);
  }
}

function baseRef(ref, field) {
  if( field === '$key' ) {
    return ref.orderByKey();
  }
  else if( field === '$priority' ) {
    return ref.orderByPriority();
  }
  else if( field === '$value' ) {
    return ref.orderByValue();
  }
  else {
    return ref.orderByChild(field);
  }
}

/**
 * A rudimentary debounce method
 * @param {function} fn the function to debounce
 * @param {object} [ctx] the `this` context to set in fn
 * @param {int} wait number of milliseconds to pause before sending out after each invocation
 * @param {int} [maxWait] max milliseconds to wait before sending out, defaults to wait * 10 or 100
 */
function debounce(fn, ctx, wait, maxWait) {
  var start, cancelTimer, args, runScheduledForNextTick;
  if( typeof(ctx) === 'number' ) {
    maxWait = wait;
    wait = ctx;
    ctx = null;
  }

  if( typeof wait !== 'number' ) {
    throw new Error('Must provide a valid integer for wait. Try 0 for a default');
  }
  if( typeof(fn) !== 'function' ) {
    throw new Error('Must provide a valid function to debounce');
  }
  if( !maxWait ) { maxWait = wait*10 || 100; }

  // clears the current wait timer and creates a new one
  // however, if maxWait is exceeded, calls runNow() on the next tick.
  function resetTimer() {
    if( cancelTimer ) {
      cancelTimer();
      cancelTimer = null;
    }
    if( start && Date.now() - start > maxWait ) {
      if(!runScheduledForNextTick){
        runScheduledForNextTick = true;
        setTimeout(runNow, 0);
      }
    }
    else {
      if( !start ) { start = Date.now(); }
      var to = setTimeout(runNow, wait);
      cancelTimer = function() { clearTimeout(to); };
    }
  }

  // Clears the queue and invokes the debounced function with the most recent arguments
  function runNow() {
    cancelTimer = null;
    start = null;
    runScheduledForNextTick = false;
    fn.apply(ctx, args);
  }

  function debounced() {
    args = Array.prototype.slice.call(arguments, 0);
    resetTimer();
  }
  debounced.running = function() {
    return start > 0;
  };

  return debounced;
}

function lastKey(list) {
  var len = list.length;
  return len? list[len-1] : null;
}

module.exports = Offset;
},{"../../common":25}],21:[function(require,module,exports){
'use strict';
var util = require('../../common');
var Cache = require('./Cache');

/**
 * @param {Firebase} ref
 * @param {String} field
 * @param {object} [opts]
 * @constructor
 */
function Paginate(ref, field, opts) {
  this.currPage = 0;
  this.field = field;
  this.ref = ref;
  this.pageSize = opts.pageSize;
  this.max = opts.maxCacheSize;
  this.subs = [];
  this.pageChangeListeners = [];
  this.pageCountListeners = [];
  this.cache = new Cache(ref, field, opts.maxCacheSize);
  this.pageCount = -1;
  this.couldHaveMore = false;
  this.cache.observeHasNext(this._countPages, this);
}

/**
 * Unload current records and load the next page into the PaginatedRef
 *
 * @return {Paginate} returns `this`
 */
Paginate.prototype.next = function() {
  if( this.hasNext() ) {
    this.currPage++;
    util.log.debug('Paginate.next: current page is %d', this.currPage);
    this._pageChange();
  }
  return this;
};

/**
 * Unload current records and load the previous page into the PaginatedRef.
 *
 * @return {Paginate} returns `this`
 */
Paginate.prototype.prev = function() {
  if( this.hasPrev() ) {
    this.currPage--;
    util.log.debug('Paginate.prev: current page is %d', this.currPage);
    this._pageChange();
  }
  return this;
};

/**
 * Skip to a specific page. The pageNumber must be less than pageCount.
 *
 * @param {int} pageNumber
 * @return {Paginate} returns `this`
 */
Paginate.prototype.setPage = function(pageNumber) {
  if( pageNumber > 0 && pageNumber <= this.pageCount ) {
    this.currPage = pageNumber;
    util.log.debug('Paginate.setPage: current page is %d', this.currPage);
    this._pageChange();
  }
  else {
    util.log.warn('Paginate.setPage: invalid page number %d', pageNumber);
  }
};

/**
 * @return {boolean} true if there are more records after the currently loaded page
 */
Paginate.prototype.hasNext = function() {
  return this.cache.hasNext();
};

/**
 * @return {boolean} true if there are more records before the currently loaded page
 */
Paginate.prototype.hasPrev = function() {
  return this.currPage > 1;
};

/**
 * Invoked whenever the page count changes. This may not be accurate if number of pages
 * exceeds the maxCacheSize.
 *
 * The callback is delivered two arguments. The first is the {int} count, and the second
 * is a {boolean}couldHaveMore which is true whenever we have run into maxCacheSize (i.e. there
 * could be more)
 *
 * @param {Function} callback
 * @param {Object} [context]
 * @return {Function} a dispose function that cancels the listener
 */
Paginate.prototype.onPageChange = function(callback, context) {
  var listeners = this.pageChangeListeners;
  var parts = [callback, context];
  listeners.push(parts);
  callback.call(context, this.currPage);
  return function() {
    util.remove(listeners, parts);
  };
};

/**
 * Invoked whenever the local page count is changed. This may not include
 * all records that exist on the remote server, as it is limited by maxCacheSize
 */
Paginate.prototype.onPageCount = function(callback, context) {
  var listeners = this.pageCountListeners;
  var parts = [callback, context];
  listeners.push(parts);
  if( this.pageCount > -1 ) {
    callback.call(context, this.pageCount, this.couldHaveMore);
  }
  else {
    this._countPages();
  }
  return function() {
    util.remove(listeners, parts);
  };
};

/**
 * Asynchronously fetch the total page count. This maxes a REST API
 * call using shallow=true. All the keys must be able to fit in memory at the same time.
 *
 * @param {Function} [callback]
 * @param {Object} [context]
 */
Paginate.prototype.getCountByDowloadingAllKeys = function(callback, context) {
  var self = this;
  self.downloadingEverything = true;
  var url = self.ref.ref().toString();
  if( !url.match(/\/$/) ) { url += '/'; }
  url += '.json?shallow=true';
  microAjax(url, function(data) {
    var count = 0;
    try {
      count = util.keys(JSON.parse(data)).length;
    }
    catch(e) {
      util.log.warn(e);
    }
    util.log.debug('Paginate.getCountByDownloadingAllKeys: found %d keys', count);
    self.downloadingEverything = false;
    self.pageCount = countPages(count, self.pageSize);
    self.couldHaveMore = false;
    self._notifyPageCount();
    if( callback ) { callback.call(context, count); }
  });
};

/**
 * Deletes locally cached data and cancels all listeners. Unloads
 * records and triggers child_removed events.
 */
Paginate.prototype.destroy = function() {
  this.cache.destroy();
  this.cache = null;
  this.ref = null;
  util.each(this.subs, function(fn) { fn(); });
  this.subs = [];
  this.pageCountListeners.length = 0;
  this.pageChangeListeners.length = 0;
};

Paginate.prototype._countPages = function() {
  var self = this;
  var currPage = self.currPage;
  if( !this.downloadingEverything ) {
    if( self.pageCount === -1 ) {
      var max = self.max;
      var pageSize = self.pageSize;
      var ref = this.ref.ref().limitToFirst(max);
      ref.once('value', function(snap) {
        if( self.pageCount === -1 ) { // double-null check pattern (may have changed during async op)
          self.couldHaveMore = snap.numChildren() === max;
          self.pageCount = Math.ceil(snap.numChildren() / pageSize);
          self._notifyPageCount();
          self._countPages();
        }
      });
    }
    else if( currPage >= self.pageCount ) {
      self.pageCount = currPage;
      self.couldHaveMore = self.cache.hasNext();
      self._notifyPageCount();
    }
  }
};

Paginate.prototype._pageChange = function() {
  var currPage = this.currPage;
  var start = (currPage -1) * this.pageSize;
  this.cache.moveTo(start, this.pageSize);
  this._countPages();
  util.each(this.pageChangeListeners, function(parts) {
    parts[0].call(parts[1], currPage);
  });
};

Paginate.prototype._notifyPageCount = function() {
  var pageCount = this.pageCount;
  var couldHaveMore = this.couldHaveMore;
  util.each(this.pageCountListeners, function(parts) {
    parts[0].call(parts[1], pageCount, couldHaveMore);
  });
};

function countPages(recordCount, pageSize) {
  if( recordCount === 0 ) {
    return 0;
  }
  else {
    return Math.ceil(recordCount / pageSize);
  }
}

// https://code.google.com/p/microajax/
// new BSD license: http://opensource.org/licenses/BSD-3-Clause
function microAjax(url,callbackFunction){var o={};o.bindFunction=function(caller,object){return function(){return caller.apply(object,[object]);};};o.stateChange=function(object){if(o.request.readyState==4) o.callbackFunction(o.request.responseText);};o.getRequest=function(){if(window.ActiveXObject) return new ActiveXObject('Microsoft.XMLHTTP');else if(window.XMLHttpRequest) return new XMLHttpRequest();return false;};o.postBody=(arguments[2]||"");o.callbackFunction=callbackFunction;o.url=url;o.request=o.getRequest();if(o.request){var req=o.request;req.onreadystatechange=o.bindFunction(o.stateChange,o);if(o.postBody!==""){req.open("POST",url,true);req.setRequestHeader('X-Requested-With','XMLHttpRequest');req.setRequestHeader('Content-type','application/x-www-form-urlencoded');req.setRequestHeader('Connection','close');}else{req.open("GET",url,true);} req.send(o.postBody);} return o;} // jshint ignore:line

module.exports = Paginate;

},{"../../common":25,"./Cache":19}],22:[function(require,module,exports){
'use strict';
var util      = require('../../common');

function ReadOnlyRef(ref) {
  this._ref = ref;
  this._obs = new util.Observable(
    ['value', 'child_added', 'child_removed', 'child_moved', 'child_changed']
  );
}


ReadOnlyRef.prototype = {
  'on': function(event, callback, cancel, context) {
    this._obs.observe(event, callback, cancel, context);
  },

  'once': function(event, callback, cancel, context) {
    var self = this;
    function fn(snap) {
      /*jshint validthis:true */
      self.off(event, fn, self);
      callback.call(context, snap);
    }
    this.on(event, fn, cancel, this);
  },

  'off': function(event, callback, context) {
    this._obs.stopObserving(event, callback, context);
  },

  /****************************
   * WRAPPER FUNCTIONS
   ****************************/
  'ref': function() {
    return this._ref;
  },
  'child': wrapMaster('child'),
  'parent': wrapMaster('parent'),
  'root': wrapMaster('root'),
  'name': wrapMaster('name'),
  'key': wrapMaster('key'),
  'toString': wrapMaster('toString'),

  'auth': wrapMaster('auth'),
  'unauth': wrapMaster('unauth'),
  'authWithCustomToken': wrapMaster('authWithCustomToken'),
  'authAnonymously': wrapMaster('authAnonymously'),
  'authWithPassword': wrapMaster('authWithPassword'),
  'authWithOAuthPopup': wrapMaster('authWithOAuthPopup'),
  'authWithOAuthRedirect': wrapMaster('authWithOAuthRedirect'),
  'authWithOAuthToken': wrapMaster('authWithOAuthToken'),
  'getAuth': wrapMaster('getAuth'),
  'onAuth': wrapMaster('onAuth'),
  'offAuth': wrapMaster('offAuth'),
  'createUser': wrapMaster('createUser'),
  'changePassword': wrapMaster('changePassword'),
  'removeUser': wrapMaster('removeUser'),
  'resetPassword': wrapMaster('resetPassword'),
  'changeEmail': wrapMaster('changeEmail'),

  'goOffline': wrapMaster('goOffline'),
  'goOnline': wrapMaster('goOnline'),

  /****************************
   * UNSUPPORTED FUNCTIONS
   ***************************/
  'set': isReadOnly('set'),
  'update': isReadOnly('update'),
  'remove': isReadOnly('remove'),
  'push': isReadOnly('push'),
  'setWithPriority': isReadOnly('setWithPriority'),
  'setPriority': isReadOnly('setPriority'),
  'transaction': isReadOnly('transaction'),

  /** @deprecated */
  'limit': notSupported('limit'),

  'onDisconnect': notSupported('onDisconnect'),
  'orderByChild': notSupported('orderByChild'),
  'orderByKey': notSupported('orderByKey'),
  'orderByPriority': notSupported('orderByPriority'),
  'limitToFirst': notSupported('limitToFirst'),
  'limitToLast': notSupported('limitToLast'),
  'startAt': notSupported('startAt'),
  'endAt': notSupported('endAt'),
  'equalTo': notSupported('equalTo'),

  /** INTERNAL METHODS */
  $trigger: function() {
    this._obs.triggerEvent.apply(this._obs, util.toArray(arguments));
  }
};

function wrapMaster(method) {
  return function() {
    var args = util.toArray(arguments);
    var ref = this.ref();
    return ref[method].apply(ref, args);
  };
}

function isReadOnly(method) {
  return function() {
    throw new Error(method + ' is not supported. This is a read-only reference. You can ' +
    'modify child records after calling .child(), or work with the original by using .ref().');
  };
}

function notSupported(method) {
  return function() {
    throw new Error(method + ' is not supported for Paginate and Scroll references. ' +
    'Try calling it on the original reference used to create the instance instead.');
  };
}

module.exports = ReadOnlyRef;
},{"../../common":25}],23:[function(require,module,exports){
'use strict';
var Cache = require('./Cache');

/**
 * @param {ReadOnlyRef} readOnlyRef
 * @param {String} field
 * @param {Object} [opts]
 * @constructor
 */
function Scroll(readOnlyRef, field, opts) {
  this.max = opts.windowSize;
  this.start = 0;
  this.end = 0;
  this.cache = new Cache(readOnlyRef, field, opts.maxCacheSize);
}

/**
 * Load the next numberToAppend records and trigger child_added events
 * for them. If the total number of records exceeds maxRecords, then
 * child_removed events will be triggered for the first items in the list.
 *
 * @param {int} numberToAppend
 */
Scroll.prototype.next = function(numberToAppend) {
  if( this.hasNext() ) {
    this.end = this.end + numberToAppend;
    this.start = Math.max(0, this.end - this.max, this.start);
    this.cache.moveTo(this.start, this.end - this.start);
  }
};

/**
 * Load the previous numberToAppend records and trigger child_added events
 * for them. If the total number of records exceeds maxRecords, then
 * child_removed events will be triggered for the last items in the list.
 *
 * @param {int} numberToPrepend
 */
Scroll.prototype.prev = function(numberToPrepend) {
  if( this.hasPrev() ) {
    this.start = Math.max(0, this.start - numberToPrepend);
    this.end = Math.min(this.start + this.max, this.end);
    this.cache.moveTo(this.start, this.end-this.start);
  }
};

/**
 * @return {boolean} true if there are more records after the currently loaded page
 */
Scroll.prototype.hasNext = function() {
  return this.cache.hasNext();
};

/**
 * @return {boolean} true if there are more records before the currently loaded page
 */
Scroll.prototype.hasPrev = function() {
  return this.start > 0;
};

Scroll.prototype.observeHasNext = function(callback, context) {
  return this.cache.observeHasNext(callback, context);
};

/**
 * Deletes locally cached data and cancels all listeners. Unloads
 * records and triggers child_removed events.
 */
Scroll.prototype.destroy = function() {
  this.cache.destroy();
  this.ref = null;
  this.cache = null;
};

module.exports = Scroll;
},{"./Cache":19}],24:[function(require,module,exports){
/**
 * This file loads all the public methods from
 * the common/ library. To fetch all methods
 * for internal use, just do require('./src/common'),
 * which loads index.js and includes the private methods.
 */

var util = require('./index.js');
exports.log = util.log;
exports.logLevel = util.logLevel;
exports.escapeEmail = util.escapeEmail;
},{"./index.js":25}],25:[function(require,module,exports){
/**
 * This file loads the entire common/ package for INTERNAL USE.
 * The public methods are specified by exports.js
 */

var util = require('./libs/util.js');
var log = require('./libs/logger.js');

util.extend(
  exports,
  util,
  {
    args: require('./libs/args.js'),
    log: log,
    logLevel: log.logLevel,
    Observable: require('./libs/Observable.js'),
    Observer: require('./libs/Observer.js'),
    queue: require('./libs/queue.js')
  }
);
},{"./libs/Observable.js":26,"./libs/Observer.js":27,"./libs/args.js":28,"./libs/logger.js":29,"./libs/queue.js":30,"./libs/util.js":31}],26:[function(require,module,exports){
'use strict';

var util = require('./util.js');
var getArgs = require('./args.js');
var log = require('./logger.js');
var Observer = require('./Observer.js');

/**
 * A simple observer model for watching events.
 * @param eventsMonitored
 * @param [opts] can contain callbacks for onAdd, onRemove, and onEvent, as well as a list of oneTimeEvents
 * @constructor
 */
function Observable(eventsMonitored, opts) {
  if( !opts ) { opts = {}; }
  this._observableProps = parseProps(eventsMonitored, opts);
  this.resetObservers();
}
Observable.prototype = {
  /**
   * @param {String} event
   * @param {Function|util.Observer} callback
   * @param {Function} [cancelFn]
   * @param {Object} [scope]
   */
  observe: function(event, callback, cancelFn, scope) {
    var args = getArgs('observe', arguments, 2, 4), obs;
    event = args.nextFromReq(this._observableProps.eventsMonitored);
    if( event ) {
      callback = args.nextReq('function');
      cancelFn = args.next('function');
      scope = args.next('object');
      obs = new Observer(this, event, callback, scope, cancelFn);
      this._observableProps.observers[event].push(obs);
      this._observableProps.onAdd(event, obs);
      if( this.isOneTimeEvent(event) ) {
        checkOneTimeEvents(event, this._observableProps, obs);
      }
    }
    return obs;
  },

  /**
   * @param {String|Array} [event]
   * @returns {boolean}
   */
  hasObservers: function(event) {
    return this.getObservers(event).length > 0;
  },

  /**
   * @param {String|Array} events
   * @param {Function|Observer} callback
   * @param {Object} [scope]
   */
  stopObserving: function(events, callback, scope) {
    var args = getArgs('stopObserving', arguments);
    events = args.next(['array', 'string'], this._observableProps.eventsMonitored);
    callback = args.next(['function']);
    scope = args.next(['object']);
    util.each(events, function(event) {
      var removes = [];
      var observers = this.getObservers(event);
      util.each(observers, function(obs) {
        if( obs.matches(event, callback, scope) ) {
          obs.notifyCancelled(null);
          removes.push(obs);
        }
      }, this);
      removeAll(this._observableProps.observers[event], removes);
      if( removes.length ) {
        this._observableProps.onRemove(event, removes);
      }
    }, this);
  },

  /**
   * Turn off all observers and call cancel callbacks with an error
   * @param {String} error
   * @returns {*}
   */
  abortObservers: function(error) {
    var removes = [];
    if( this.hasObservers() ) {
      var observers = this.getObservers().slice();
      util.each(observers, function(obs) {
        obs.notifyCancelled(error);
        removes.push(obs);
      }, this);
      this.resetObservers();
      if( removes.length ) {
        this._observableProps.onRemove(this.event, removes);
      }
    }
  },

  /**
   * @param {String|Array} [events]
   * @returns {*}
   */
  getObservers: function(events) {
    events = getArgs('getObservers', arguments).listFrom(this._observableProps.eventsMonitored, true);
    return getObserversFor(this._observableProps, events);
  },

  triggerEvent: function(event) {
    var args = getArgs('triggerEvent', arguments);
    var events = args.listFromWarn(this._observableProps.eventsMonitored, true);
    var passThruArgs = args.restAsList();
    if( events ) {
      util.each(events, function(e) {
        if( this.isOneTimeEvent(event) ) {
          if( util.isArray(this._observableProps.oneTimeResults, event) ) {
            log.warn('One time event was triggered twice, should by definition be triggered once', event);
            return;
          }
          this._observableProps.oneTimeResults[event] = passThruArgs;
        }
        var observers = this.getObservers(e), ct = 0;
        util.each(observers, function(obs) {
          obs.notify.apply(obs, passThruArgs.slice(0));
          ct++;
        });
        this._observableProps.onEvent.apply(null, [e, ct].concat(passThruArgs.slice(0)));
      }, this);
    }
  },

  resetObservers: function() {
    util.each(this._observableProps.eventsMonitored, function(key) {
      this._observableProps.observers[key] = [];
    }, this);
  },

  isOneTimeEvent: function(event) {
    return util.contains(this._observableProps.oneTimeEvents, event);
  },

  observeOnce: function(event, callback, cancelFn, scope) {
    var args = getArgs('observeOnce', arguments, 2, 4), obs;
    event = args.nextFromWarn(this._observableProps.eventsMonitored);
    if( event ) {
      callback = args.nextReq('function');
      cancelFn = args.next('function');
      scope = args.next('object');
      obs = new Observer(this, event, callback, scope, cancelFn, true);
      this._observableProps.observers[event].push(obs);
      this._observableProps.onAdd(event, obs);
      if( this.isOneTimeEvent(event) ) {
        checkOneTimeEvents(event, this._observableProps, obs);
      }
    }
    return obs;
  }
};

function removeAll(list, items) {
  util.each(items, function(x) {
    var i = util.indexOf(list, x);
    if( i >= 0 ) {
      list.splice(i, 1);
    }
  });
}

function getObserversFor(props, events) {
  var out = [];
  util.each(events, function(event) {
    if( !util.has(props.observers, event) ) {
      log.warn('Observable.hasObservers: invalid event type %s', event);
    }
    else {
      if( props.observers[event].length ) {
        out = out.concat(props.observers[event]);
      }
    }
  });
  return out;
}

function checkOneTimeEvents(event, props, obs) {
  if( util.has(props.oneTimeResults, event) ) {
    obs.notify.apply(obs, props.oneTimeResults[event]);
  }
}

function parseProps(eventsMonitored, opts) {
  return util.extend(
    { onAdd: util.noop, onRemove: util.noop, onEvent: util.noop, oneTimeEvents: [] },
    opts,
    { eventsMonitored: eventsMonitored, observers: {}, oneTimeResults: {} }
  );
}

module.exports = Observable;
},{"./Observer.js":27,"./args.js":28,"./logger.js":29,"./util.js":31}],27:[function(require,module,exports){
'use strict';
var util = require('./util.js');

/** Observer
 ***************************************************
 * @private
 * @constructor
 */
function Observer(observable, event, notifyFn, context, cancelFn, oneTimeEvent) {
  if( typeof(notifyFn) !== 'function' ) {
    throw new Error('Must provide a valid notifyFn');
  }
  this.observable = observable;
  this.fn = notifyFn;
  this.event = event;
  this.cancelFn = cancelFn||function() {};
  this.context = context;
  this.oneTimeEvent = !!oneTimeEvent;
}

Observer.prototype = {
  notify: function() {
    var args = util.toArray(arguments);
    this.fn.apply(this.context, args);
    if( this.oneTimeEvent ) {
      this.observable.stopObserving(this.event, this.fn, this.context);
    }
  },

  matches: function(event, fn, context) {
    if( util.isArray(event) ) {
      return util.contains(event, function(e) {
        return this.matches(e, fn, context);
      }, this);
    }
    return (!event || event === this.event) &&
      (!fn || fn === this || fn === this.fn) &&
      (!context || context === this.context);
  },

  notifyCancelled: function(err) {
    this.cancelFn.call(this.context, err||null);
  }
};

module.exports = Observer;
},{"./util.js":31}],28:[function(require,module,exports){
'use strict';
var util = require('./util.js');
var log = require('./logger.js');

function Args(fnName, args, minArgs, maxArgs) {
  if( typeof(fnName) !== 'string' || !util.isObject(args) ) {
    throw new Error('Args requires at least 2 args: fnName, arguments[, minArgs, maxArgs]');
  }
  if( !(this instanceof Args) ) { // allow it to be called without `new` prefix
    return new Args(fnName, args, minArgs, maxArgs);
  }
  this.fnName = fnName;
  this.argList = util.toArray(args);
  this.origArgs = util.toArray(args);
  var len = this.length = this.argList.length;
  this.pos = -1;
  if(util.isUndefined(minArgs)) { minArgs = 0; }
  if(util.isUndefined(maxArgs)) { maxArgs = this.argList.length; }
  if( len < minArgs || len > maxArgs ) {
    var rangeText = maxArgs > minArgs? util.printf('%d to %d', minArgs, maxArgs) : minArgs;
    throw Error(util.printf('%s must be called with %s arguments, but received %d', fnName, rangeText, len));
  }
}

Args.prototype = {
  /**
   * Grab the original list of args
   * @return {Array} containing the original arguments
   */
  orig: function() { return this.origArgs.slice(0); },

  /**
   * Return whatever args remain as a list
   * @returns {Array|string|Buffer|Blob|*}
   */
  restAsList: function(minLength, types) {
    var list = this.argList.slice(0);
    if( minLength || types ) {
      for (var i = 0, len = list.length; i < len; i++) {
        this._arg(types||true, null, i < minLength);
      }
    }
    return list;
  },

  /**
   * Advance the argument list by one and discard the value
   * @return {Args}
   */
  skip: function() {
    if( this.argList.length ) {
      this.pos++;
      this.argList.shift();
    }
    return this;
  },

  /**
   * Read the next optional argument, but only if `types` is true, or it is of a type specified
   * In the case that it is not present, return `defaultValue`
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   * @param [defaultValue]
   */
  next: function(types, defaultValue) {
    return this._arg(types, defaultValue, false);
  },

  /**
   * Read the next optional argument, but only if `types` is true, or it is of a type specified. In the case
   * that it is not present, return `defaultValue` and log a warning to the console
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   * @param [defaultValue]
   */
  nextWarn: function(types, defaultValue) {
    return this._arg(types, defaultValue, 'warn');
  },

  /**
   * Read the next required argument, but only if `types` is true, or it is of a type specified. In the case
   * that it is not present, throw an Error
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   */
  nextReq: function(types) {
    return this._arg(types, null, true);
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * return defaultValue.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue]
   */
  nextFrom: function(choices, defaultValue) {
    return this._from(choices, defaultValue, false);
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * return defaultValue and log a warning to the console.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue]
   */
  nextFromWarn: function(choices, defaultValue) {
    return this._from(choices, defaultValue, 'warn');
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * throw an Error.
   * @param {Array} choices a list of allowed values
   */
  nextFromReq: function(choices) {
    return this._from(choices, null, true);
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, return defaultValue.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
   */
  listFrom: function(choices, defaultValue) {
    return this._list(choices, defaultValue, false);
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, return defaultValue and log a warning.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
   */
  listFromWarn: function(choices, defaultValue) {
    return this._list(choices, defaultValue, 'warn');
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, throw an Error.
   * @param {Array} choices a list of allowed values
   */
  listFromReq: function(choices) {
    return this._list(choices, null, true);
  },

  _arg: function(types, defaultValue, required) {
    this.pos++;
    if( util.isUndefined(types) || types === null ) { types = true; }
    if( this.argList.length && isOfType(this.argList[0], types) ) {
      return format(this.argList.shift(), types);
    }
    else {
      if( required ) {
        assertRequired(required, this.fnName, this.pos, util.printf('must be of type %s', types));
      }
      return defaultValue;
    }
  },

  _from: function(choices, defaultValue, required) {
    this.pos++;
    if( this.argList.length && util.contains(choices, this.argList[0]) ) {
      return this.argList.shift();
    }
    else {
      if( required ) {
        assertRequired(required, this.fnName, this.pos, util.printf('must be one of %s', choices));
      }
      return defaultValue;
    }
  },

  _list: function(choices, defaultValue, required) {
    this.pos++;
    var out = [];
    var list = this.argList[0];
    if( this.argList.length && !util.isEmpty(list) && (util.isArray(list) || !util.isObject(list)) ) {
      this.argList.shift();
      if( util.isArray(list) ) {
        out = util.map(list, function(v) {
          if( util.contains(choices, v) ) {
            return v;
          }
          else {
            badChoiceWarning(this.fnName, v, choices);
            return undefined;
          }
        }, this);
      }
      else {
        if( util.contains(choices, list) ) {
          out = [list];
        }
        else {
          badChoiceWarning(this.fnName, list, choices);
        }
      }
    }
    if( util.isEmpty(out) ) {
      if( required ) {
        assertRequired(required, this.fnName, this.pos,
          util.printf('choices must be in [%s]', choices));
      }
      return defaultValue === true? choices : defaultValue;
    }
    return out;
  }

};

function isOfType(val, types) {
  if( types === true ) { return true; }
  if( !util.isArray(types) ) { types = [types]; }
  return util.contains(types, function(type) {
    switch(type) {
      case 'array':
        return util.isArray(val);
      case 'string':
        return typeof(val) === 'string';
      case 'number':
        return isFinite(parseInt(val, 10));
      case 'int':
      case 'integer':
        return isFinite(parseFloat(val));
      case 'object':
        return util.isObject(val);
      case 'function':
        return typeof(val) === 'function';
      case 'bool':
      case 'boolean':
        return typeof(val) === 'boolean';
      case 'boolean-like':
        return !util.isObject(val); // be lenient here
      default:
        throw new Error('Args received an invalid data type: '+type);
    }
  });
}

function assertRequired(required, fnName, pos, msg) {
  msg = util.printf('%s: invalid argument at pos %d, %s (received %s)', fnName, pos, msg);
  if( required === true ) {
    throw new Error(msg);
  }
  else if( util.has(log, required) ) {
    log[required](msg);
  }
  else {
    throw new Error('The `required` value passed to Args methods must either be true or a method name from logger');
  }
}

function badChoiceWarning(fnName, val, choices) {
  log.warn('%s: invalid choice %s, must be one of [%s]', fnName, val, choices);
}

function format(val, types) {
  if( types === true ) { return val; }
  var type = util.isArray(types)? types[0] : types;
  switch(type) {
    case 'array':
      return util.isArray(val)? val : [val];
    case 'string':
      return val + '';
    case 'number':
      return parseFloat(val);
    case 'int':
    case 'integer':
      return parseInt(val, 10);
    case 'bool':
    case 'boolean':
    case 'boolean-like':
      return !!val;
    case 'function':
    case 'object':
      return val;
    default:
      throw new Error('Args received an invalid data type: '+type);
  }
}

module.exports = Args;
},{"./logger.js":29,"./util.js":31}],29:[function(require,module,exports){
'use strict';
/*global window*/
var DEFAULT_LEVEL = 2; //  errors and warnings
var oldDebuggingLevel = false;
var fakeConsole = {
  error: noop, warn: noop, info: noop, log: noop, debug: noop, time: noop, timeEnd: noop, group: noop, groupEnd: noop
};
var util = require('./util.js');

var logger = function() {
  logger.log.apply(null, util.toArray(arguments));
};

/** hints for the IDEs */
logger.warn = noop;
logger.error = noop;
logger.info = noop;
logger.log = noop;
logger.debug = noop;
logger.isErrorEnabled = noop;
logger.isWarnEnabled = noop;
logger.isInfoEnabled = noop;
logger.isLogEnabled = noop;
logger.isDebugEnabled = noop;

/**
 * @param {int} level use -1 to turn off all logging, use 5 for maximum debugging
 * @param {string|RegExp} [grep] filter logs to those whose first value matches this text or expression
 */
logger.logLevel = function(level, grep) {
  if( typeof(level) !== 'number' ) { level = levelInt(level); }

  if( oldDebuggingLevel === level ) { return function() {}; }

  util.each(['error', 'warn', 'info', 'log', 'debug'], function(k, i) {
    var isEnabled = typeof(console) !== 'undefined' && level >= i+1;
    if( isEnabled ) {
      // binding is necessary to prevent IE 8/9 from having a spaz when
      // .apply and .call are used on console methods
      var fn = util.bind(console[k==='debug'? 'log' : k], console);
      logger[k] = function() {
        var args = util.toArray(arguments);
        if( args.length > 1 && typeof args[0] === 'string' ) {
          var m = args[0].match(/(%s|%d|%j)/g);
          if( m ) {
            var newArgs = [util.printf.apply(util, args)];
            args = args.length > m.length+1? newArgs.concat(args.slice(m.length+1)) : newArgs;
          }
        }
        if( !grep || !filterThis(grep, args) ) {
          fn.apply(typeof(console) === 'undefined'? fakeConsole : console, args);
        }
      };
    }
    else {
      logger[k] = noop;
    }
    logger['is' + ucfirst(k) + 'Enabled'] = function() { return isEnabled; };
  });

  // provide a way to revert the debugging level if I want to change it temporarily
  var off = (function(x) {
    return function() { logger.logLevel(x); };
  })(oldDebuggingLevel);
  oldDebuggingLevel = level;

  return off;
};

function ucfirst(s) {
  return s.charAt(0).toUpperCase() + s.substr(1);
}

function getDefaultLevel() {
  var m;
  if( typeof(window) !== 'undefined' && window.location && window.location.search ) {
    m = window.location.search.match('\bdebugLevel=([0-9]+)\b');
  }
  return m? parseInt(m[1], 10) : DEFAULT_LEVEL;
}

function noop() { return true; }

function filterThis(expr, args) {
  if( !args.length ) {
    return true;
  }
  else if( expr instanceof RegExp ) {
    return !expr.test(args[0]+'');
  }
  else {
    return !(args[0]+'').match(expr);
  }
}

function levelInt(x) {
  switch(x) {
    case false: return 0;
    case 'off': return 0;
    case 'none': return 0;
    case 'error': return 1;
    case 'warn': return 2;
    case 'warning': return 2;
    case 'info': return 3;
    case 'log': return 4;
    case 'debug': return 5;
    case true: return DEFAULT_LEVEL;
    case 'on': return DEFAULT_LEVEL;
    case 'all': return DEFAULT_LEVEL;
    default: return DEFAULT_LEVEL;
  }
}

logger.logLevel(getDefaultLevel());
module.exports = logger;
},{"./util.js":31}],30:[function(require,module,exports){
'use strict';
var util = require('./util.js');

function Queue(criteriaFunctions) {
  this.needs = 0;
  this.met = 0;
  this.queued = [];
  this.errors = [];
  this.criteria = [];
  this.processing = false;
  util.each(criteriaFunctions, this.addCriteria, this);
}

Queue.prototype = {
  /**
   * @param {Function} criteriaFn
   * @param {Object} [scope]
   */
  addCriteria: function(criteriaFn, scope) {
    if( this.processing ) {
      throw new Error('Cannot call addCriteria() after invoking done(), fail(), or handler() methods');
    }
    this.criteria.push(scope? [criteriaFn, scope] : criteriaFn);
    return this;
  },

  /**
   * Returns a node-like callback to be invoked when an op is completed.
   * @returns {function}
   */
  getHandler: function() {
    var doneCallback, result;
    this.addCriteria(function(done) {
      if( result !== util.undef ) {
        done(result);
      }
      else {
        doneCallback = done;
      }
    });
    return function(err) {
      if( doneCallback ) { doneCallback(err); }
      else { result = err; }
    };
  },

  ready: function() {
    return this.needs === this.met;
  },

  done: function(fn, context) {
    if( fn ) {
      this._runOrStore(function() {
        if( !this.hasErrors() ) { fn.call(context); }
      });
    }
    return this;
  },

  fail: function(fn, context) {
    this._runOrStore(function() {
      if( this.hasErrors() ) { fn.apply(context, this.getErrors()); }
    });
    return this;
  },

  handler: function(fn, context) {
    this._runOrStore(function() {
      fn.apply(context, this.getErrors());
    });
    return this;
  },

  /**
   * @param {Queue} queue
   */
  chain: function(queue) {
    this.addCriteria(queue.handler, queue);
    return this;
  },

  when: function(def) {
    this._runOrStore(function() {
      if( this.hasErrors() ) {
        def.reject.apply(def, this.getErrors());
      }
      else {
        def.resolve();
      }
    });
  },

  addError: function(e) {
    this.errors.push(e);
  },

  hasErrors: function() {
    return this.errors.length;
  },

  getErrors: function() {
    return this.errors.slice(0);
  },

  _process: function() {
    this.processing = true;
    this.needs = this.criteria.length;
    util.each(this.criteria, this._evaluateCriteria, this);
  },

  _evaluateCriteria: function(criteriaFn) {
    var scope = null;
    if( util.isArray(criteriaFn) ) {
      scope = criteriaFn[1];
      criteriaFn = criteriaFn[0];
    }
    try {
      criteriaFn.call(scope, util.bind(this._criteriaMet, this));
    }
    catch(e) {
      this.addError(e);
    }
  },

  _criteriaMet: function(error) {
    if( error ) { this.addError(error); }
    this.met++;
    if( this.ready() ) {
      util.each(this.queued, this._run, this);
    }
  },

  _runOrStore: function(fn) {
    if( !this.processing ) { this._process(); }
    if( this.ready() ) {
      this._run(fn);
    }
    else {
      this.queued.push(fn);
    }
  },

  _run: function(fn) {
    fn.call(this);
  }
};

module.exports = function(criteriaFns, callback) {
  var q = new Queue(criteriaFns);
  if( callback ) { q.done(callback); }
  return q;
};

},{"./util.js":31}],31:[function(require,module,exports){
(function (global){
/*jshint unused:vars */
/*jshint bitwise:false */

'use strict';

var undef;
var util = exports;
var READ_EVENTS = ['value', 'child_added', 'child_removed', 'child_updated', 'child_changed'];

util.undef = undef;
util.Firebase = global.Firebase || require('firebase');

util.isDefined = function(v) {
  return v !== undef;
};

util.isUndefined = function(v) {
  return v === undef;
};

util.isObject = function(v) {
  return Object.prototype.isPrototypeOf(v);
};

util.isArray = function(v) {
  return (Array.isArray || isArray).call(null, v);
};

/**
 * @param v value to test or if `key` is provided, the object containing method
 * @param {string} [key] if provided, v is an object and this is the method we want to find
 * @returns {*}
 */
util.isFunction = function(v, key) {
  if( typeof(key) === 'string' ) {
    return util.isObject(v) && util.has(v, key) && typeof(v[key]) === 'function';
  }
  else {
    return typeof(v) === 'function';
  }
};

util.toArray = function(vals, startFrom) {
  var newVals = util.map(vals, function(v, k) { return v; });
  return startFrom > 0? newVals.slice(startFrom) : newVals;
};

/**
 * @param {boolean} [recursive] if true, keys are merged recursively, otherwise, they replace the base
 * @param {...object} base
 * @returns {Object}
 */
util.extend = function(recursive, base) {
  var args = util.toArray(arguments);
  var recurse = typeof args[0] === 'boolean' && args.shift();
  var out = args.shift();
  util.each(args, function(o) {
    if( util.isObject(o) ) {
      util.each(o, function(v,k) {
        out[k] = recurse && util.isObject(out[k])? util.extend(true, out[k], v) : v;
      });
    }
  });
  return out;
};

util.bind = function(fn, scope) {
  var args = Array.prototype.slice.call(arguments, 1);
  return (fn.bind || bind).apply(fn, args);
};

/**
 * @param {Object|Array} vals
 * @returns {boolean}
 */
util.isEmpty = function(vals) {
  return vals === undef || vals === null ||
    (util.isArray(vals) && vals.length === 0) ||
    (util.isObject(vals) && !util.contains(vals, function(v) { return true; }));
};

/**
 * @param {Object|Array} vals
 * @returns {Array} of keys
 */
util.keys = function(vals) {
  var keys = [];
  util.each(vals, function(v, k) { keys.push(k); });
  return keys;
};

/**
 * Create an array using values returned by an iterator. Undefined values
 * are discarded.
 *
 * @param vals
 * @param iterator
 * @param [scope]
 * @returns {*}
 */
util.map = function(vals, iterator, scope) {
  var out = [];
  util.each(vals, function(v, k) {
    var res = iterator.call(scope, v, k, vals);
    if( res !== undef ) { out.push(res); }
  });
  return out;
};

/**
 *
 * @param {Object} list
 * @param {Function} iterator
 * @param {Object} [scope]
 */
util.mapObject = function(list, iterator, scope) {
  var out = {};
  util.each(list, function(v,k) {
    var res = iterator.call(scope, v, k, list);
    if( res !== undef ) {
      out[k] = res;
    }
  });
  return out;
};

/**
 * Returns the first match
 * @param {Object|Array} vals
 * @param {Function} iterator
 * @param {Object} [scope] set `this` in the callback or undefined
 */
util.find = function(vals, iterator, scope) {
  if( util.isArray(vals) ) {
    for(var i = 0, len = vals.length; i < len; i++) {
      if( iterator.call(scope, vals[i], i, vals) === true ) { return vals[i]; }
    }
  }
  else if( util.isObject(vals) ) {
    var key;
    for (key in vals) {
      if (vals.hasOwnProperty(key) && iterator.call(scope, vals[key], key, vals) === true) {
        return vals[key];
      }
    }
  }
  return undef;
};

util.filter = function(list, iterator, scope) {
  var isArray = util.isArray(list);
  var out = isArray? [] : {};
  util.each(list, function(v,k) {
    if( iterator.call(scope, v, k, list) ) {
      if( isArray ) {
        out.push(v);
      }
      else {
        out[k] = v;
      }
    }
  });
  return out;
};

util.reduce = function(list, accumulator, iterator) {
  util.each(list, function(v, k) {
    accumulator = iterator(accumulator, v, k, list);
  });
  return accumulator;
};

util.has = function(vals, key) {
  return util.isObject(vals) && vals[key] !== undef;
};

util.val = function(list, key) {
  return util.has(list, key)? list[key] : undef;
};

util.contains = function(vals, iterator, scope) {
  if( typeof(iterator) !== 'function' ) {
    if( util.isArray(vals) ) {
      return util.indexOf(vals, iterator) > -1;
    }
    iterator = (function(testVal) {
      return function(v) { return v === testVal; };
    })(iterator);
  }
  return util.find(vals, iterator, scope) !== undef;
};

util.each = function(vals, cb, scope) {
  if( util.isArray(vals) || isArguments(vals) ) {
    (vals.forEach || forEach).call(vals, cb, scope);
  }
  else if( util.isObject(vals) ) {
    var key;
    for (key in vals) {
      if (vals.hasOwnProperty(key)) {
        cb.call(scope, vals[key], key, vals);
      }
    }
  }
};

util.indexOf = function(list, item) {
  return (list.indexOf || indexOf).call(list, item);
};

util.remove = function(list, item) {
  var res = false;
  if( util.isArray(list) ) {
    var i = util.indexOf(list, item);
    if( i > -1 ) {
      list.splice(i, 1);
      res = true;
    }
  }
  else if( util.isObject(list) ) {
    var key;
    for (key in list) {
      if (list.hasOwnProperty(key) && item === list[key]) {
        res = true;
        delete list[key];
        break;
      }
    }
  }
  return res;
};

/**
 * Invoke a function after a setTimeout(..., 0), to help convert synch callbacks to async ones.
 * Additional args after `scope` will be passed to the fn when it is invoked
 *
 * @param {Function} fn
 * @param {Object} scope the `this` scope inside `fn`
 */
util.defer = function(fn, scope) {
  var args = util.toArray(arguments);
  setTimeout(util.bind.apply(null, args), 0);
};

/**
 * Call a method on each instance contained in the list. Any additional args are passed into the method.
 *
 * @param {Object|Array} list contains instantiated objects
 * @param {String} methodName
 * @return {Array}
 */
util.call = function(list, methodName) {
  var args = util.toArray(arguments, 2);
  var res = [];
  util.each(list, function(o) {
    if( typeof(o) === 'function' && !methodName ) {
      return res.push(o.apply(null, args));
    }
    if( util.isObject(o) && typeof(o[methodName]) === 'function' ) {
      res.push(o[methodName].apply(o, args));
    }
  });
  return res;
};

/**
 * Determine if two variables are equal. They must be:
 *  - of the same type
 *  - arrays must be same length and all values pass isEqual()
 *  - arrays must be in same order
 *  - objects must contain the same keys and their values pass isEqual()
 *  - object keys do not have to be in same order unless objectsSameOrder === true
 *  - primitives must pass ===
 *
 * @param a
 * @param b
 * @param {boolean} [objectsSameOrder]
 * @returns {boolean}
 */
util.isEqual = function(a, b, objectsSameOrder) {
  if( a === b ) { return true; }
  else if( typeof(a) !== typeof(b) ) {
    return false;
  }
  else if( util.isObject(a) && util.isObject(b) ) {
    var isA = util.isArray(a);
    var isB = util.isArray(b);
    if( isA || isB ) {
      return isA && isB && a.length === b.length && !util.contains(a, function(v, i) {
        return !util.isEqual(v, b[i]);
      });
    }
    else {
      var aKeys = objectsSameOrder? util.keys(a) : util.keys(a).sort();
      var bKeys = objectsSameOrder? util.keys(b) : util.keys(b).sort();
      return util.isEqual(aKeys, bKeys) &&
        !util.contains(a, function(v, k) { return !util.isEqual(v, b[k]); });
    }
  }
  else {
    return false;
  }
};

util.bindAll = function(context, methods) {
  util.each(methods, function(m,k) {
    if( typeof(m) === 'function' ) {
      methods[k] = util.bind(m, context);
    }
  });
  return methods;
};

util.printf = function() {
  var localArgs = util.toArray(arguments);
  var template = localArgs.shift();
  var matches = template.match(/(%s|%d|%j)/g);
  if( matches && localArgs.length ) {
    util.find(matches, function (m) {
      template = template.replace(m, format(localArgs.shift(), m));
      return localArgs.length === 0;
    });
  }
  return template;
};

util.mergeToString = function(list) {
  if( list.length === 0 ) { return null; }
  else if( list.length === 1 ) { return list[0]; }
  else {
    return '[' + list.join('][') + ']';
  }
};

// credits: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
util.construct = function(constructor, args) {
  function F() {
    return constructor.apply(this, args);
  }
  F.prototype = constructor.prototype;
  return new F();
};

util.noop = function() {};

var wrappingClasses = [];
util.isFirebaseRef = function(x) {
  // ES5 throws TypeError if getPrototypeOf() called on a non-object
  if( !util.isObject(x) ) {
    return false;
  }

  // necessary because instanceof won't work on Firebase Query objects
  // so we can't simply do instanceof here
  var proto = Object.getPrototypeOf(x);
  if( proto && proto.constructor === util.Firebase.prototype.constructor ) {
    return true;
  }

  //todo-hack: SDK 2.2.x no longer works with the above. This is a hack to make that work until fixed
  if( typeof(x.ref) === 'function' && typeof(x.ref().transaction) === 'function' ) {
    return true;
  }

  return util.isFirebaseRefWrapper(x);
};

util.isFirebaseRefWrapper = function(x) {
  return util.contains(wrappingClasses, function(C) {
    return x instanceof C;
  });
};

util.isQueryRef = function(x) {
  return util.isFirebaseRef(x) && typeof x.transaction !== 'function';
};

// Add a Class as a valid substitute for a Firebase reference, so that it will
// pass util.isFirebaseRef(). This means that it must provide all the Firebase
// API methods and behave exactly like a Firebase instance in all cases.
util.registerFirebaseWrapper = function(WrappingClass) {
  wrappingClasses.push(WrappingClass);
};

// for test units
util._mockFirebaseRef = function(mock) {
  util.Firebase = mock;
};

util.escapeEmail = function(email) {
  return (email||'').replace('.', ',');
};


util.assertValidEvent = function(event) {
  if( !util.contains(READ_EVENTS, event) ) {
    throw new Error('Event must be one of ' + READ_EVENTS + ', but received ' + event);
  }
};

/**
 * Inherit prototype of another JS class. Adds an _super() method for the constructor to call.
 * It takes any number of arguments (whatever the inherited classes constructor methods are),
 *
 * Limitations:
 *    1. Inherited constructor must be callable with no arguments (to make instanceof work), but can be called
 *       properly during instantiation with arguments by using _super(this, args...)
 *    2. Can only inherit one super class, no exceptions
 *    3. Cannot call prototype = {} after using this method
 *
 * @param {Function} Child
 * @param {Function} Parent a class which can be constructed without passing any arguments
 * @returns {Function}
 */
util.inherits = function(Child, Parent) {
  var methodSets = [Child.prototype].concat(util.toArray(arguments).slice(2));
  Child.prototype = new Parent();
  Child.prototype.constructor = Parent;
  util.each(methodSets, function(fnSet) {
    util.each(fnSet, function(fn, key) {
      Child.prototype[key] = fn;
    });
  });
  Child.prototype._super = function() {
    Parent.apply(this, arguments);
  };
  return Child;
};

util.deepCopy = function(data) {
  if( !util.isObject(data) ) { return data; }
  var out = util.isArray(data)? [] : {};
  util.each(data, function(v,k) {
    out[k] = util.deepCopy(v);
  });
  return out;
};

util.pick = function(obj, keys) {
  if( !util.isObject(obj) ) { return {}; }
  var out = util.isArray(obj)? [] : {};
  util.each(keys, function(k) {
    out[k] = obj[k];
  });
  return out;
};

util.eachByPath = function(map, data, callback, context) {
  var dataByPath = {};
  util.each(data, function(v,k) {
    var p = map.pathFor(k);
    var f = map.getField(k);
    var key = f? f.id : k;
    if( !util.has(dataByPath, p.name()) ) {
      dataByPath[p.name()] = { path: p, data: {} };
    }
    dataByPath[p.name()].data[key] = v;
  });

  util.each(dataByPath, function(collated) {
    callback.call(context, collated.path, collated.data);
  });
};

function format(v, type) {
  switch(type) {
    case '%d':
      return parseInt(v, 10);
    case '%j':
      v =  util.isObject(v)? JSON.stringify(v) : v+'';
      if(v.length > 500) {
        v = v.substr(0, 500)+'.../*truncated*/...}';
      }
      return v;
    case '%s':
      return v + '';
    default:
      return v;
  }
}

function isArguments(o) {
  return util.isObject(o) && o+'' === '[object Arguments]';
}

/****************************************
 * POLYFILLS
 ****************************************/

// a polyfill for Function.prototype.bind (invoke using call or apply!)
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
function bind(oThis) {
  /*jshint validthis:true */
  if (typeof this !== 'function') {
    // closest thing possible to the ECMAScript 5 internal IsCallable function
    throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
  }

  var aArgs = Array.prototype.slice.call(arguments, 1),
    fToBind = this,
    FNOP = function () {},
    fBound = function () {
      return fToBind.apply(
          this instanceof FNOP && oThis? this : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments))
      );
    };

  FNOP.prototype = this.prototype;
  fBound.prototype = new FNOP();

  return fBound;
}

// a polyfill for Array.prototype.forEach (invoke using call or apply!)
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
function forEach(fn, scope) {
  /*jshint validthis:true */
  var i, len;
  for (i = 0, len = this.length; i < len; ++i) {
    if (i in this) {
      fn.call(scope, this[i], i, this);
    }
  }
}

// a polyfill for Array.isArray
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
function isArray(vArg) {
  return Object.prototype.toString.call(vArg) === '[object Array]';
}

// a polyfill for Array.indexOf
// credits: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
function indexOf(searchElement, fromIndex) {
  /*jshint validthis:true */
  if (this === null) {
    throw new TypeError();
  }
  var n, k, t = Object(this),
    len = t.length >>> 0;

  if (len === 0) {
    return -1;
  }
  n = 0;
  if (arguments.length > 1) {
    n = Number(arguments[1]);
    if (n !== n) { // shortcut for verifying if it's NaN
      n = 0;
    } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
      n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
  }
  if (n >= len) {
    return -1;
  }
  for (k = n >= 0 ? n : Math.max(len - Math.abs(n), 0); k < len; k++) {
    if (k in t && t[k] === searchElement) {
      return k;
    }
  }
  return -1;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"firebase":"firebase"}],"firebase-util":[function(require,module,exports){
/**
 * This file establishes the Firebase.util namespace and
 * defines the exports for all packages when using node.js
 */
'use strict';

var util = require('./common/index.js');

// put all our public methods into the exported scope
util.extend(exports,
  require('./common/exports.js'),
  require('./NormalizedCollection/exports.js'),
  require('./Paginate/exports.js')
);

/*global window */
if( typeof window !== 'undefined' ) {
  if( !window.hasOwnProperty('Firebase') ) {
    console.warn('Firebase not found on the global window instance. Cannot add Firebase.util namespace.');
  }
  else {
    window.Firebase.util = util;
  }
}
},{"./NormalizedCollection/exports.js":2,"./Paginate/exports.js":18,"./common/exports.js":24,"./common/index.js":25}]},{},[1]);
