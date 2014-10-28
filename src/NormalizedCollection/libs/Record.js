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

  //todo forEachKey
  //todo
  //todo
  //todo
  //todo
  //todo

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
    return util.extend.apply(null, util.map(snaps, function(ss) {
      return map.extractData(ss, isExport);
    }));
  },

  _start: function(event) {
    if( !util.has(this._eventManagers, event) ) {
      this._eventManagers[event] = event === 'value'?
        new ValueEventManager(this) : new ChildEventManager(event, this);
    }
    this._eventManagers[event].start();
  },

  _stop:   function(event) {
    if( util.has(this._eventManagers, event) ) {
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
      this.running = false;
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
      var dyno = new Dyno(path, this.rec.getPathManager(), this.rec.getFieldMap(), 'value', fn);
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
  this.pm = rec.getPathManager();
}

ChildEventManager.prototype = {
  start: function() {
    util.each(this.pm.getPathNames(), function(pathName) {
      var event = this.event;
      var path = this.pm.getPath(pathName);
      var fn = util.bind(this.update, this);
      if( path.hasDependency() ) {
        var dyno = new Dyno(path, this.rec.getFieldMap(), event, fn);
        this.subs.push(dyno.dispose);
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
    this.rec._trigger(this.event, [snap]);
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
    if( ref && ref.name() !== snap.val() ) {
      // any time the id changes, remove the old listener
      ref.off(event, updateFn);
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