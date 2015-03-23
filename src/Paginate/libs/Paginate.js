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
  this.max = opts.maxCacheSize;
  this.subs = [];
  this.pageChangeListeners = [];
  this.pageCountListeners = [];
  this.cache = new Cache(ref, field, opts.maxCacheSize);
  this.pageCount = -1;
  this.couldHaveMore = false;
  this.cache.observeHasNext(this._countPages, this);
}

/**
 * Unload current records and load the next page into the PaginatedRef
 *
 * @return {Paginate} returns `this`
 */
Paginate.prototype.next = function() {
  if( this.hasNext() ) {
    this.currPage++;
    util.log.debug('Paginate.next: current page is %d', this.currPage);
    this._pageChange();
  }
  return this;
};

/**
 * Unload current records and load the previous page into the PaginatedRef.
 *
 * @return {Paginate} returns `this`
 */
Paginate.prototype.prev = function() {
  if( this.hasPrev() ) {
    this.currPage--;
    util.log.debug('Paginate.prev: current page is %d', this.currPage);
    this._pageChange();
  }
  return this;
};

/**
 * Skip to a specific page. The pageNumber must be less than pageCount.
 *
 * @param {int} pageNumber
 * @return {Paginate} returns `this`
 */
Paginate.prototype.setPage = function(pageNumber) {
  if( pageNumber > 0 && pageNumber <= this.pageCount ) {
    this.currPage = pageNumber;
    util.log.debug('Paginate.setPage: current page is %d', this.currPage);
    this._pageChange();
  }
  else {
    util.log.warn('Paginate.setPage: invalid page number %d', pageNumber);
  }
};

/**
 * @return {boolean} true if there are more records after the currently loaded page
 */
Paginate.prototype.hasNext = function() {
  return this.cache.hasNext();
};

/**
 * @return {boolean} true if there are more records before the currently loaded page
 */
Paginate.prototype.hasPrev = function() {
  return this.currPage > 1;
};

/**
 * Invoked whenever the page count changes. This may not be accurate if number of pages
 * exceeds the maxCacheSize.
 *
 * The callback is delivered two arguments. The first is the {int} count, and the second
 * is a {boolean}couldHaveMore which is true whenever we have run into maxCacheSize (i.e. there
 * could be more)
 *
 * @param {Function} callback
 * @param {Object} [context]
 * @return {Function} a dispose function that cancels the listener
 */
Paginate.prototype.onPageChange = function(callback, context) {
  var listeners = this.pageChangeListeners;
  var parts = [callback, context];
  listeners.push(parts);
  callback.call(context, this.currPage);
  return function() {
    util.remove(listeners, parts);
  };
};

/**
 * Invoked whenever the local page count is changed. This may not include
 * all records that exist on the remote server, as it is limited by maxCacheSize
 */
Paginate.prototype.onPageCount = function(callback, context) {
  var listeners = this.pageCountListeners;
  var parts = [callback, context];
  listeners.push(parts);
  if( this.pageCount > -1 ) {
    callback.call(context, this.pageCount, this.couldHaveMore);
  }
  else {
    this._countPages();
  }
  return function() {
    util.remove(listeners, parts);
  };
};

/**
 * Asynchronously fetch the total page count. This maxes a REST API
 * call using shallow=true. All the keys must be able to fit in memory at the same time.
 *
 * @param {Function} [callback]
 * @param {Object} [context]
 */
Paginate.prototype.getCountByDowloadingAllKeys = function(callback, context) {
  var self = this;
  self.downloadingEverything = true;
  var url = self.ref.ref().toString();
  if( !url.match(/\/$/) ) { url += '/'; }
  url += '.json?shallow=true';
  microAjax(url, function(data) {
    var count = 0;
    try {
      count = util.keys(JSON.parse(data)).length;
    }
    catch(e) {
      util.log.warn(e);
    }
    util.log.debug('Paginate.getCountByDownloadingAllKeys: found %d keys', count);
    self.downloadingEverything = false;
    self.pageCount = countPages(count, self.pageSize);
    self.couldHaveMore = false;
    self._notifyPageCount();
    if( callback ) { callback.call(context, count); }
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
  this.pageCountListeners.length = 0;
  this.pageChangeListeners.length = 0;
};

Paginate.prototype._countPages = function() {
  var self = this;
  var currPage = self.currPage;
  if( !this.downloadingEverything ) {
    if( self.pageCount === -1 ) {
      var max = self.max;
      var pageSize = self.pageSize;
      var ref = this.ref.ref().limitToFirst(max);
      ref.once('value', function(snap) {
        if( self.pageCount === -1 ) { // double-null check pattern (may have changed during async op)
          self.couldHaveMore = snap.numChildren() === max;
          self.pageCount = Math.ceil(snap.numChildren() / pageSize);
          self._notifyPageCount();
          self._countPages();
        }
      });
    }
    else if( currPage >= self.pageCount ) {
      self.pageCount = currPage;
      self.couldHaveMore = self.cache.hasNext();
      self._notifyPageCount();
    }
  }
};

Paginate.prototype._pageChange = function() {
  var currPage = this.currPage;
  var start = (currPage -1) * this.pageSize;
  this.cache.moveTo(start, this.pageSize);
  this._countPages();
  util.each(this.pageChangeListeners, function(parts) {
    parts[0].call(parts[1], currPage);
  });
};

Paginate.prototype._notifyPageCount = function() {
  var pageCount = this.pageCount;
  var couldHaveMore = this.couldHaveMore;
  util.each(this.pageCountListeners, function(parts) {
    parts[0].call(parts[1], pageCount, couldHaveMore);
  });
};

function countPages(recordCount, pageSize) {
  if( recordCount === 0 ) {
    return 0;
  }
  else {
    return Math.ceil(recordCount / pageSize);
  }
}

// https://code.google.com/p/microajax/
// new BSD license: http://opensource.org/licenses/BSD-3-Clause
function microAjax(url,callbackFunction){var o={};o.bindFunction=function(caller,object){return function(){return caller.apply(object,[object]);};};o.stateChange=function(object){if(o.request.readyState==4) o.callbackFunction(o.request.responseText);};o.getRequest=function(){if(window.ActiveXObject) return new ActiveXObject('Microsoft.XMLHTTP');else if(window.XMLHttpRequest) return new XMLHttpRequest();return false;};o.postBody=(arguments[2]||"");o.callbackFunction=callbackFunction;o.url=url;o.request=o.getRequest();if(o.request){var req=o.request;req.onreadystatechange=o.bindFunction(o.stateChange,o);if(o.postBody!==""){req.open("POST",url,true);req.setRequestHeader('X-Requested-With','XMLHttpRequest');req.setRequestHeader('Content-type','application/x-www-form-urlencoded');req.setRequestHeader('Connection','close');}else{req.open("GET",url,true);} req.send(o.postBody);} return o;} // jshint ignore:line

module.exports = Paginate;
