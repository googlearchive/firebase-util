'use strict';

var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');
var RecordField = require('./RecordField');
var AbstractRecord = require('./AbstractRecord');
var Snapshot = require('./Snapshot');
var util = require('../../common');

function Record(pathManager, fieldMap) {
  this._super(pathManager, fieldMap);
  this._eventManagers = {};
}

util.inherits(Record, AbstractRecord, {
  child: function(key) {
    var pm = new PathManager([this.map.pathFor(key)]);
    var fm = new FieldMap(pm);
    fm.add({key: FieldMap.key(pm.first(), '$value'), alias: key});
    return new RecordField(pm, fm);
  },

  getChildSnaps: function(snapsArray, fieldName) {
    //todo handle $key and $value
    //todo should return snap.child(field.id)
    //todo
    //todo
    //todo
    //todo
//    var pathUrl = this.map.pathFor(fieldName).url();
//    var snap = util.find(snapsArray, function(ss) {
//      return ss.ref().ref().toString() === pathUrl;
//    }) || snapsArray[0];
//    return [snap];
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
  this.pm = rec.getPathMgr();
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
      var dyno = new Dyno(path, this.rec.getPathMgr(), this.rec.getFieldMap(), 'value', fn);
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
  this.pm = rec.getPathMgr();
}

ChildEventManager.prototype = {
  start: function() {
    util.each(this.pm.getPathNames(), function(pathName) {
      var event = this.event;
      var path = this.pm.getPath(pathName);
      var fn = util.bind(this.update, this);
      if( path.hasDependency() ) {
        var dyno = new Dyno(path, this.rec.getPathMgr(), this.rec.getFieldMap(), event, fn);
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
 * @param {PathManager} pathMgr
 * @param {FieldMap} fieldMap
 * @param {string} event
 * @param {function} updateFn
 * @constructor
 */
function Dyno(path, pathMgr, fieldMap, event, updateFn) {
  var dep = path.getDependency();
  var depPath = pathMgr.getPath(dep.path);
  var depRef = depPath.ref();
  if( dep.field !== '$value' ) {
    depRef = depRef.child(fieldMap.get(dep.field).id);
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