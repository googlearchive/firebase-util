'use strict';
var util = require('../../common');
var Cache = require('./Cache');

/**
 * @param {Firebase} ref
 * @param {String} field
 * @param {object} [opts]
 * @constructor
 */
function Paginate(ref, field, opts) {
  this.currPage = 0;
  this.field = field;
  this.ref = ref;
  this.pageSize = opts.pageSize;
  this.max = opts.maxCache;
  this.subs = [];
  this.cache = new Cache(ref, field, opts.maxCache);
}

/**
 * Unload current records and load the next page into the PaginatedRef
 *
 * @return {Future} resolves after all removed/added events are fired
 */
Paginate.prototype.next = function() {
  if( this.hasNext() ) {
    this.currPage++;
    this._pageChange();
  }
};

/**
 * Unload current records and load the previous page into the PaginatedRef.
 *
 * @return {Future} resolves after all removed/added events are fired
 */
Paginate.prototype.prev = function() {
  if( this.hasPrev() ) {
    this.currPage--;
    this._pageChange();
  }
};

/**
 * @return {bool} true if there are more records after the currently loaded page
 */
Paginate.prototype.hasNext = function() {
  return this.currPage === 0 || this.cache.offset.getKey() !== false;
};

/**
 * @return {bool} true if there are more records before the currently loaded page
 */
Paginate.prototype.hasPrev = function() {
  return this.currPage > 1;
};

/**
 * Invoked whenever the local record count is changed. This may not include
 * all records that exist on the remote server, as it is limited by maxCache
 */
Paginate.prototype.onRecordCount = function(callback, context) {
  var oldRecCount = -1;
  var ref = this.ref.ref().limitToFirst(this.max);
  var fn = ref.on('value', function(snap) {
    var newRecCount = snap.numChildren();
    if( newRecCount !== oldRecCount ) {
      oldRecCount = newRecCount;
      callback.call(context, newRecCount);
    }
  });
  function dispose() { ref.off(fn); }
  this.subs.push(dispose);
  return dispose;
};

/**
 * Invoked whenever the local page count is changed. This may not include
 * all records that exist on the remote server, as it is limited by maxCache
 */
Paginate.prototype.onPageCount = function(callback, context) {
  var oldPageCount = -1;
  var pageSize = this.pageSize;
  var ref = this.ref.ref().limitToFirst(this.max);
  var fn = ref.on('value', function(snap) {
    var newPageCount = Math.ceil(snap.numChildren() / pageSize);
    if( newPageCount !== oldPageCount ) {
      oldPageCount = newPageCount;
      callback.call(context, newPageCount);
    }
  });
  function dispose() { ref.off(fn); }
  this.subs.push(dispose);
  return dispose;
};

/**
 * Asynchronously fetch the total page count. This maxes a REST API
 * call using shallow=true. All the keys must be able to fit in memory at the same time.
 */
Paginate.prototype.fetchRecordCountByDownloadingEverything = function(callback, context) {
  var url = this.ref.ref().toString();
  if( !url.match(/\/$/) ) { url += '/'; }
  url += '.json?shallow=true';
  microAjax(url, function(data) {
    callback.call(context, util.keys(data).length);
  });
};

/**
 * Deletes locally cached data and cancels all listeners. Unloads
 * records and triggers child_removed events.
 */
Paginate.prototype.destroy = function() {
  this.cache.destroy();
  this.cache = null;
  this.ref = null;
  util.each(this.subs, function(fn) { fn(); });
  this.subs = [];
};

Paginate.prototype._pageChange = function() {
  this.cache.moveTo(this.currPage-1 * this.pageSize, this.currPage * this.pageSize -1);
};

exports.Paginate = Paginate;

// https://code.google.com/p/microajax/
// new BSD license: http://opensource.org/licenses/BSD-3-Clause
function microAjax(B,A){this.bindFunction=function(E,D){return function(){return E.apply(D,[D])}};this.stateChange=function(D){if(this.request.readyState==4){this.callbackFunction(this.request.responseText)}};this.getRequest=function(){if(window.ActiveXObject){return new ActiveXObject("Microsoft.XMLHTTP")}else{if(window.XMLHttpRequest){return new XMLHttpRequest()}}return false};this.postBody=(arguments[2]||"");this.callbackFunction=A;this.url=B;this.request=this.getRequest();if(this.request){var C=this.request;C.onreadystatechange=this.bindFunction(this.stateChange,this);if(this.postBody!==""){C.open("POST",B,true);C.setRequestHeader("X-Requested-With","XMLHttpRequest");C.setRequestHeader("Content-type","application/x-www-form-urlencoded");C.setRequestHeader("Connection","close")}else{C.open("GET",B,true)}C.send(this.postBody)}}; // jshint ignore:line