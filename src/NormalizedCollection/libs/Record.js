'use strict';

var FieldMap = require('./FieldMap');
var RecordField = require('./RecordField');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function Record(fieldMap) {
  this._super(fieldMap);
  this._eventManagers = {};
}

util.inherits(Record, AbstractRecord, {
  child: function(key) {
    var fm = FieldMap.fieldMap(this.map, key);
    return new RecordField(fm);
  },

  hasChild: function(snaps, key) {
    var field = this.map.getField(key);
    if( !field ) { return false; }
    var snap = this.map.snapFor(snaps, key);
    return snap !== null && snap.hasChild(key);
  },

  getChildSnaps: function(snaps, fieldName) {
    var child;
    var snap = this.map.snapFor(snaps, fieldName);
    var field = this.map.getField(fieldName);
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
    var map = this.map;
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
    var map = this.map;
    var data = util.extend.apply(null, util.map(snaps, function(ss) {
      return map.extractData(ss, isExport);
    }));
    if( isExport && snaps.length > 0 && snaps[0].getPriority() !== null ) {
      if( !util.isObject(data) ) {
        data = {'.value': data};
      }
      data['.priority'] = snaps[0].getPriority();
    }
    return data;
  },

  _start: function(event) {
    if( !util.has(this._eventManagers, event) ) {
      this._eventManagers[event] = event === 'value'?
        new ValueEventManager(this) : new ChildEventManager(event, this);
    }
    this._eventManagers[event].start();
  },

  _stop:   function(event) {
    if (util.has(this._eventManagers, event)) {
      this._eventManagers[event].stop();
    }
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
    if( !util.contains(this.snaps, null) ) {
      this.rec._trigger('value', this.snaps);
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

  _init: function() {
    this.snaps = {};
    this.subs = [];
    util.each(this.pm.getPathNames(), function(pathName) {
      this.snaps[pathName] = null;
    }, this);
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

  update: function(snap) {
    if( snap !== null ) {
      var args = [this.event, snap.name(), snap];
      this.rec._trigger.apply(this.rec, args);
    }
  }
};

/**
 * Process a path which depends on the value of another field. We have
 * to monitor the field it depends on for value events and update
 * the ref that we listen on whenever the id is modified.
 *
 * @param {Path} path
 * @param {FieldMap} fieldMap
 * @param {string} event
 * @param {function} updateFn
 * @constructor
 */
function Dyno(path, fieldMap, event, updateFn) {
  var dep = path.getDependency();
  var depPath = fieldMap.getPath(dep.path);
  var depRef = depPath.ref();
  if( dep.field !== '$value' ) {
    depRef = depRef.child(fieldMap.getField(dep.field).id);
  }
  var ref;

  // establish our listener at the field which contains the id of our ref
  var depFn = depRef.on('value', function(snap) {
    if( ref && ref.key() !== snap.val() ) {
      // any time the id changes, remove the old listener
      ref.off(event, updateFn);
      updateFn(null);
    }
    if( snap.val() !== null ) {
      // establish our listener at the correct dynamic id for values
      ref = path.ref().child(snap.val());
      ref.on(event, updateFn);
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

module.exports = Record;