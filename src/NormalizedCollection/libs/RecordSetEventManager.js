'use strict';

var util = require('../../common');

/**
 * Monitors the references attached to a RecordSet and maintains a cache of
 * current snapshots (inside RecordList below). Any time there is an update, this calls
 * RecordSet._trigger() to invoke the correct event types (child_added, child_removed, value, et al)
 * on the RecordSet object.
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
      util.log.debug('Loading sets of normalized records from master list at %s', this.url);
      this.running = true;
      this.masterRef.on('child_added',   this._add,    this);
      this.masterRef.on('child_removed', this._remove, this);
      this.masterRef.on('child_moved',   this._move,   this);
      this.masterRef.once('value', this.recList.loaded, this.recList);
    }
    return this;
  },

  stop: function() {
    if( this.running ) {
      this.running = false;
      this.masterRef.off('child_added',   this._add,    this);
      this.masterRef.off('child_removed', this._remove, this);
      this.masterRef.off('child_moved',   this._move,   this);
      this.recList.unloaded();
      this.recList.removeAll();
    }
    return this;
  },

  _add: function(snap, prevChild) {
    this.recList.add(snap.name(), prevChild);
  },

  _remove: function(snap) {
    this.recList.remove(snap.name());
  },

  _move: function(snap, prevChild) {
    this.recList.move(snap, prevChild);
  }
};

function RecordList(observable, url) {
  this.obs = observable;
  this.url = url;
  this.recs = {};
  this.recIds = [];
  this.snaps = {};
  this.loading = {};
}

RecordList.prototype = {
  add: function(key, prevChild) {
    util.log.debug('RecordSetEventManager: Adding record %s after %s', key, prevChild);
    var rec = this.obs.child(key);
    this.loading[key] = {rec: rec, prev: prevChild};
    rec.watch('value', util.bind(this._change, this, key));
  },

  remove: function(key) {
    var oldSnap = this._dropRecord(key);
    if( oldSnap !== null ) {
      this._notify('child_removed', key, oldSnap);
    }
  },

  move: function(snap, prevChild) {
    var key = snap.name();
    if(util.has(this.recs, key)) {
      var currPos = util.indexOf(this.recIds, key);
      this.recIds.splice(currPos, 1);
      this._putAfter(key, prevChild);
      this._notify('child_moved', key);
    }
  },

  loaded: function() {
    util.log.debug('RecordSetEventManager: Initial data has been loaded from master list at %s', this.url);
    this.loadComplete = true;
    this._notifyValue();
  },

  unloaded: function() { this.loadComplete = false; },

  findKey: function(key) {
    //todo cache these lookups in a weak map?
    return util.indexOf(this.recIds, key);
  },

  removeAll: function() {
    util.each(this.recs, function(rec, key) {
      this.remove(key);
    }, this);
  },

  _change: function(key, event, snaps) {
    this.snaps[key] = snaps;
    if(util.has(this.loading, key)) {
      // newly added record
      var r = this.loading[key];
      delete this.loading[key];
      this.recs[key] = r.rec;
      this._putAfter(key, r.prev);
      this._notify('child_added', key);
    }
    else if(util.has(this.recs, key)) {
      // a changed record
      this._notify('child_changed', key);
    }
    else {
      util.log('RecordSetEventManager: Orphan key ' + key + ' ignored. ' +
          'Probably deleted locally and changed remotely at the same time.');
    }
  },

  _notify: function(event, key) {
    var args = [event, key];
    // do not fetch prev child for other events as it costs an indexOf
    switch(event) {
      case 'child_added':
      case 'child_moved':
        var prev = this._getPrevChild(key);
        args.push(this.snaps[key], prev);
        break;
      case 'child_changed':
        args.push(this.snaps[key]);
        break;
      case 'child_removed':
        break;
      default:
        throw new Error('Invalid event type ' + event + ' for key ' + key);
    }
    util.log.debug('RecordSetEventManager: %s %s', event, key);
    this.obs._trigger.apply(this.obs, args);
    if( this.loadComplete ) {
      this._notifyValue();
    }
  },

  _notifyValue: function() {
    this.obs._trigger.call(this.obs, 'value', util.toArray(this.snaps));
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
    if(util.has(this.recs, key)) {
      var snap = this.snaps[key];
      this.recs[key].unwatch('value', this._change, this);
      delete this.recs[key];
      delete this.snaps[key];
      delete this.loading[key];
      util.remove(this.recIds, key);
      return snap;
    }
    return null;
  }
};

module.exports = RecordSetEventManager;