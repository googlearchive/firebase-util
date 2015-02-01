'use strict';
var util = require('../../common');
var Offset = require('./Offset');

function Cache(outRef, sortField, maxRecordsLoaded) {
  this.offset = new Offset({field: sortField, max: maxRecordsLoaded});
  this.outRef = outRef;
  this.inRef = null;
  this.queryRef = null;
  this.keys = {};
  this.start = -1;
  this.count = -1;
}

Cache.moveTo = function(startOffset, numberOfRecords) {
  var s = this.start, e = this.count;
  this.start = startOffset;
  this.count = numberOfRecords;
  if( s !== this.start ) {
    this.offset.goTo(startOffset);
  }
  else if( e !== this.count ) {
    this._refChange();
  }
};

Cache.prototype.destroy = function() {
  this._unsubscribe();
  this.offset.destroy();
  this.offset = null;
  this.start = -1;
  this.count = -1;
  this.inRef = null;
  this.outRef = null;
  this.queryRef = null;
  this.keys = null;
};

Cache.prototype._keyChange = function(val, key, ref) {
  this.inRef = ref;
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
  }
};

Cache.prototype._refChange = function() {
  this._unsubscribe();
  if( this.inRef && this.start > -1 ) {
    this.queryRef = this.inRef.limitToFirst(this.count - this.start);
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

Cache.prototype._removeOrphans = function(valueSnap) {
  util.each(this.keys, function(cachedSnap, key) {
    if( !valueSnap.hasChild(key) ) {
      this.outRef.$trigger('child_removed', cachedSnap);
      delete this.keys[key];
    }
  }, this);
};

exports.Cache = Cache;