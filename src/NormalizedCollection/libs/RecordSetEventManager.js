'use strict';

var util = require('../../common');

function RecordSetEventManager(parentRec) {
  var pm = parentRec.getPathManager();
  this.masterRef = pm.first().ref();
  this.recList = new RecordList(parentRec);
  this.running = false;
}

RecordSetEventManager.prototype = {
  start: function() {
    if( !this.running ) {
      this.running = true;
      this.masterRef.on('child_added',   this._add,    this);
      this.masterRef.on('child_removed', this._remove, this);
      this.masterRef.on('child_moved',   this._move,   this);
    }
    return this;
  },

  stop: function() {
    if( this.running ) {
      this.running = false;
      this.masterRef.off('child_added',   this._add,    this);
      this.masterRef.off('child_removed', this._remove, this);
      this.masterRef.off('child_moved',   this._move,   this);
      this.recList.removeAll();
    }
    return this;
  },

  _add: function(snap, prevChild) {
    var child = this.recs.child(snap.name());
    this.recList.add(snap.name(), child, prevChild);
  },

  _remove: function(snap) {
    this.recList.remove(snap.name());
  },

  _move: function(snap, prevChild) {
    this.recList.move(snap, prevChild);
  }
};

function RecordList(observable) {
  this.obs = observable;
  this.recs = {};
  this.recIds = [];
  this.snaps = {};
  this.loading = {};
}

RecordList.prototype = {
  add: function(key, rec, prevChild) {
    this.loading[key] = {rec: rec, prev: prevChild};
    rec.watch('value', this._change, this);
  },

  remove: function(key) {
    if(util.has(this.rec, key)) {
      var snaps = this.snaps[key];
      this.recs[key].unwatch('value', this._change, this);
      delete this.recs[key];
      delete this.snaps[key];
      delete this.loading[key];
      util.remove(this.recIds, key);
      this._notify('child_removed', key, snaps);
    }
  },

  move: function(snap, prevChild) {
    var key = snap.name();
    if(util.has(this.recs, key)) {
      var currPos = util.indexOf(this.recIds, key);
      this.recIds.splice(currPos, 1);
      this._putAfter(key, prevChild);
    }
  },

  _change: function(key, snaps) {
    this.snaps[key] = snaps;
    if(util.has(this.loading, key)) {
      var r = this.loading[key];
      this.recs[key] = r.rec;

      this._notify('child_added', key);
    }
    else if(util.has(this.recs, key)) {
      this._notify('child_changed', key);
    }
    else {
      console.info('orphan key ' + key + ' ignored');
    }
  },

  _notify: function(event, key) {
    var prev;
    // do not fetch prev child for other events as it costs an indexOf
    if( event === 'child_added' || event === 'child_moved' ) {
      prev = this._getPrevChild(key);
    }
    this.obs._trigger.call(this.obs, event, key, this.snaps[key], prev);
  },

  _getPrevChild: function(key) {
    var pos = util.indexOf(this.recIds, key);
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
      x = util.indexOf(this.recIds, prevKey);
      pos = x === -1? this.recIds.length : x+1;
    }
    return pos;
  },

  _putAfter: function(key, prevChild) {
    var newPos = this._posFor(prevChild);
    this.recIds.splice(newPos, 0, key);
  },

  removeAll: function() {
    util.each(this.recs, function(rec, key) {
      this.remove(key);
    }, this);
  }
};

module.exports = RecordSetEventManager;