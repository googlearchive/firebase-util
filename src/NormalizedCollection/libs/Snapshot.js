'use strict';

var util = require('../../common');

function Snapshot(ref, snaps) {
  this._ref = ref;
  // coupling: uses the private _record from Ref
  this._rec = ref._getRec();
  if( !snaps || !snaps.length ) {
    throw new Error('Must provide at least one valid snapshot to merge');
  }
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
    //todo this should probably be using aliases
    var firstChildName = childParts.pop();
    snap = new Snapshot(
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
    return this._rec.forEach(this._snaps, cb, context);
  },

  hasChild: function(fieldName) {
    var f = this._rec.getFieldMap().get(fieldName);
    if( f !== null ) {
      var url = f.path.url();
      var snap = util.find(this._snaps, function(ss) {
        return ss.ref().toString() === url;
      });
      return snap && snap.hasChild(f.id);
    }
    return false;
  },

  hasChildren: function() {
    var rec = this._rec;
    return util.find(this._snaps, function(snap) {
      return snap.forEach(function(ss) {
        return rec.hasChild(ss.ref().toString());
      });
    }) !== util.undef;
  },

  name: function() {
    return this._ref.ref().name();
  },

  numChildren: function() {
    var rec = this._rec;
    return util.reduce(this._snaps, 0, function(accum, snap) {
      snap.forEach(function(ss) {
        if( rec.hasChild(ss.ref().toString()) ) {
          accum++;
        }
      });
      return accum;
    });
  },

  ref: function() { return this._ref; },

  getPriority: function() { return this._pri; },

  exportVal: function() {
    return this._rec.mergeData(this._snaps, true);
  }
};

module.exports = Snapshot;