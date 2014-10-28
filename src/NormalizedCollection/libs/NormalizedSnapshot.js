'use strict';

var util = require('../../common');

function NormalizedSnapshot(ref, snaps) {
  this._ref = ref;
  // coupling: uses the private _record from Ref
  this._rec = ref._getRec();
  if( !snaps || !snaps.length ) {
    throw new Error('Must provide at least one valid snapshot to merge');
  }
  this._pri = snaps[0].getPriority();
  this._snaps = snaps;
}

NormalizedSnapshot.prototype = {
  val: function() {
    return this._rec.mergeData(this._snaps, false);
  },

  child: function(key) {
    //todo-bug does not work for $value and $key properly
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
    //todo-bug should probably work for $value
    return this._rec.forEachKey(this._snaps, function(childKey) {
      return cb.call(context, this.child(childKey));
    }, this);
  },

  hasChild: function(fieldName) {
    //todo optimize and/or memoize?
    var snap;
    var f = this._rec.getFieldMap().getField(fieldName);
    if( f !== null ) {
      switch(f.key) {
        case '$key':
          return true;
        case '$value':
          snap = snapFor(this._snaps, f.path.url());
          return snap && snap.val() !== null;
        default:
          snap = snapFor(this._snaps, f.path.url());
          return snap && snap.hasChild(f.id);
      }
    }
    return false;
  },

  hasChildren: function() {
    //todo-bug does not account for $value keys
    var rec = this._rec;
    return util.find(this._snaps, function(snap) {
      return snap.forEach(function(ss) {
        return rec.hasChild(ss.ref().toString());
      });
    }) !== util.undef;
  },

  name: function() {
    return this._ref.name();
  },

  numChildren: function() {
    //todo-bug does not account for nested aliases (they will change the count here)
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

  ref: function() { return this._ref.ref(); },

  getPriority: function() { return this._pri; },

  exportVal: function() {
    return this._rec.mergeData(this._snaps, true);
  }
};

function snapFor(snaps, url) {
  return util.find(snaps, function(ss) {
    return ss.ref().toString() === url;
  });
}

module.exports = NormalizedSnapshot;