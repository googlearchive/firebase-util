'use strict';
var Cache = require('./Cache');

/**
 * @param {ReadOnlyRef} readOnlyRef
 * @param {String} field
 * @param {Object} [opts]
 * @constructor
 */
function Scroll(readOnlyRef, field, opts) {
  this.max = opts.windowSize;
  this.start = 0;
  this.end = 0;
  this.cache = new Cache(readOnlyRef, field, opts.maxCacheSize);
}

/**
 * Load the next numberToAppend records and trigger child_added events
 * for them. If the total number of records exceeds maxRecords, then
 * child_removed events will be triggered for the first items in the list.
 *
 * @param {int} numberToAppend
 */
Scroll.prototype.next = function(numberToAppend) {
  if( this.hasNext() ) {
    this.end = this.end + numberToAppend;
    this.start = Math.max(0, this.end - this.max, this.start);
    this.cache.moveTo(this.start, this.end - this.start);
  }
};

/**
 * Load the previous numberToAppend records and trigger child_added events
 * for them. If the total number of records exceeds maxRecords, then
 * child_removed events will be triggered for the last items in the list.
 *
 * @param {int} numberToPrepend
 */
Scroll.prototype.prev = function(numberToPrepend) {
  if( this.hasPrev() ) {
    this.start = Math.max(0, this.start - numberToPrepend);
    this.end = Math.min(this.start + this.max, this.end);
    this.cache.moveTo(this.start, this.end-this.start);
  }
};

/**
 * @return {boolean} true if there are more records after the currently loaded page
 */
Scroll.prototype.hasNext = function() {
  return this.cache.hasNext();
};

/**
 * @return {boolean} true if there are more records before the currently loaded page
 */
Scroll.prototype.hasPrev = function() {
  return this.start > 0;
};

Scroll.prototype.observeHasNext = function(callback, context) {
  return this.cache.observeHasNext(callback, context);
};

/**
 * Deletes locally cached data and cancels all listeners. Unloads
 * records and triggers child_removed events.
 */
Scroll.prototype.destroy = function() {
  this.cache.destroy();
  this.ref = null;
  this.cache = null;
};

module.exports = Scroll;