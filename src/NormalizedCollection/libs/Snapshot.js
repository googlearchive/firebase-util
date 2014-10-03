'use strict';

var util = require('../../common');

function Snapshot(ref, snaps) {
  this._ref = ref;
  // coupling: uses the private _record from Ref
  this._rec = ref._record;
  this._pri = snaps[0].getPriority();
  this._snaps = snaps;
}

Snapshot.prototype = {
  val: function() {
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
    snap = new Snapshot(
      this._ref.child(firstChildName),
      this._rec.getChildSnaps(this._snaps, firstChildName),
      false
    );
    // iterate any nested keys and keep calling child on them
    while(childParts.length) {
      snap = snap.child(childParts.pop());
    }
    return snap;
  },

  forEach: function(cb, context) {
    var list = this.isMaster? this._snaps.slice(0, 1) : this._snaps;
    var map = this._rec.getFieldMap();
    util.each(list, function(snap) {
      snap.forEach(function(ss) {
        var ref = ss.ref().ref();
        cb.call(context, this.child(map.aliasFor(ref.parent().name(), ref.name())));
      }, this);
    });
  },

  hasChild: function(key) {
    return this._snaps.hasChild(key);
  },

  hasChildren: function() {
    return this.numChildren() > 0;
  },

  name: function() {
    return this._ref.ref().name();
  },

  numChildren: function() {
    return util.reduce(this._snaps, 0, function(accum, snap) {
      return accum + snap.numChildren();
    });
  },

  ref: function() { return this._ref; },

  getPriority: function() { return this._pri; },

  exportVal: function() {
    return this._rec.mergeData(this._snaps, true);
  }
};

module.exports = Snapshot;