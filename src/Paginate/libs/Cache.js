'use strict';
var util = require('../../common');
var Offset = require('./Offset');

function Cache(outRef, sortField, maxRecordsLoaded) {
  util.log.debug('Cache: caching %s using field=%s maxRecordsLoaded=%d', outRef.toString(), sortField, maxRecordsLoaded);
  this.offset = new Offset({field: sortField, max: maxRecordsLoaded, ref: outRef.ref()});
  this.outRef = outRef;
  this.inRef = null;
  this.queryRef = null;
  this.countRef = null;
  this.keys = {};
  this.start = 0;
  this.count = -1;
  this.endCount = -1;
  this.nextListeners = [];
  this.offset.observe(this._keyChange, this);
}

Cache.prototype.moveTo = function(startOffset, numberOfRecords) {
  util.log.debug('Cache.moveTo: startOffset=%d, numberOfRecords=%d', startOffset, numberOfRecords);
  var s = this.start, e = this.count;
  this.start = startOffset;
  this.count = numberOfRecords;
  this.endCount = this.start + this.count;
  if( s !== this.start ) {
    this.offset.goTo(startOffset, numberOfRecords);
  }
  else if( e !== this.count ) {
    this._refChange();
  }
};

Cache.prototype.hasNext = function() {
  return this.count === -1 || this.endCount > this.start + this.count;
};

Cache.prototype.hasPrev = function() {
  return this.start > 0;
};

Cache.prototype.observeHasNext = function(callback, context) {
  var list = this.nextListeners;
  var parts = [callback, context];
  list.push(parts);
  return function() {
    util.remove(list, parts);
  };
};

Cache.prototype.destroy = function() {
  this._unsubscribe();
  this.offset.destroy();
  this.offset = null;
  this.start = 0;
  this.count = -1;
  this.inRef = null;
  this.outRef = null;
  this.queryRef = null;
  this.countRef = null;
  this.keys = null;
  this.nextListeners = null;
};

Cache.prototype._keyChange = function(val, key, ref) {
  this.inRef = ref;
  util.log.debug('Cache._keyChange: %s %s %s', val, key, ref.toString());
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
    this.queryRef = null;
  }
  if( this.countRef ) {
    this.countRef.off('value', this._count, this);
    this.countRef = null;
  }
};

Cache.prototype._refChange = function() {
  this._unsubscribe();
  if( this.inRef && this.count > -1 ) {
    this.countRef = this.inRef.limitToFirst(this.count+1);
    this.countRef.on('value', this._count, this);
    //todo we should queue all the events until the once('value') is completed
    //todo so that we can trigger removed before added
    this.queryRef = this.inRef.limitToFirst(this.count);
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

Cache.prototype._count = function(snap) {
  this.endCount = this.start + snap.numChildren();
  var hasNext = this.hasNext();
  util.each(this.nextListeners, function(parts) {
    parts[0].call(parts[1], hasNext);
  });
};

Cache.prototype._removeOrphans = function(valueSnap) {
  util.each(this.keys, function(cachedSnap, key) {
    if( !valueSnap.hasChild(key) ) {
      this.outRef.$trigger('child_removed', cachedSnap);
      delete this.keys[key];
    }
  }, this);
};

module.exports = Cache;