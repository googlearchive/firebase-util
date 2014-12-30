'use strict';

//var util = require('../../common');

function NormalizedSnapshot(ref, snaps) {
  this._ref = ref;
  // coupling: uses the private _record from Ref
  this._rec = ref.$getRec();
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
    return this._rec.forEachKey(this._snaps, function(childId, childAlias) {
      //todo use this._rec.hasChild() here?
      if( childId === '$value' || childId === '$key' ) { return false; }
      return cb.call(context, this.child(childAlias));
    }, this);
  },

  hasChild: function(key) {
    //todo optimize and/or memoize?
    var parts = key.split('/').reverse();
    var res = parts.length > 0;
    var rec = this._rec;
    var nsnap = this;
    while(res && parts.length) {
      var nextKey = parts.pop();
      res = rec.hasChild(nsnap._snaps, nextKey);
      if( res && parts.length ) {
        rec = rec.child(nextKey);
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
    return this._ref.key();
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
  }
};

module.exports = NormalizedSnapshot;