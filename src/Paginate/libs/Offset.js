'use strict';
var util = require('../../common');

function Offset(opts) {
  this.keys = [];
  this.field = opts.field;
  this.ref = baseRef(opts.ref, opts.field);
  this.max = opts.max;
  this.listeners = [];
  this.curr = 0;
  this.sub = null;
  this.isSubscribing = false;
  this.lastNotifyValue = util.undef;
  this._debouncedRecache = debounce(function() {
    util.log.debug('Offset._debouncedRecache: recaching keys for offset %d', this.curr);
    this.keys = [];
    this._grow(this._listen);
  }, this, 100, 1000);
}

Offset.prototype.goTo = function(newOffset) {
  if( newOffset !== this.curr ) {
    util.log('Offset.goTo: offset changed from %d to %d', this.curr, newOffset);
    this.curr = newOffset;
    this.lastNotifyValue = util.undef;
    this._listen();
  }
};

Offset.prototype.observe = function(callback, context) {
  this.listeners.push([callback, context]);
  var key = this.getKey();
  var ref = offsetRef(this.ref, key);
  callback.call(context, key && key.val, key && key.key, ref);
};

Offset.prototype.getKey = function(offset) {
  if( !arguments.length ) { offset = this.curr; }
  if( offset === 0 ) { return null; }
  return this.keys.length > offset && this.keys[offset];
};

Offset.prototype.destroy = function() {
  this._unsubscribe();
  this.curr = 0;
  this.keys = [];
  this.lastNotifyValue = util.undef;
  this.isSubscribing = false;
};

Offset.prototype._notify = function() {
  var key = this.getKey();
  if( !util.isEqual(this.lastNotifyValue, key) ) {
    util.log('Offset._notify: key at offset %d is %s', this.curr, key && key.key);
    this.lastNotifyValue = key;
    var ref = offsetRef(this.ref, key);
    util.each(this.listeners, function(parts) {
      parts[0].call(parts[1], key && key.val, key && key.key, ref);
    });
  }
};

Offset.prototype._recache = function() {
  if( !this.isSubscribing ) {
    this._debouncedRecache();
  }
};

var killCount = 0;
Offset.prototype._grow = function(callback) {
  var self = this;
  var len = self.keys.length;
  if( self.curr >= len ) {
    var oldKey = self.getKey();
    var startAt = lastKey(self.keys);
    var limit = Math.min(self.curr + (startAt? 2 : 1) - len, self.max);
    var ref = startAt !== null? self.ref.startAt(startAt.val, startAt.key) : self.ref;
    ref.limitToFirst(limit).once('value', function(snap) {
      var skipFirst = startAt !== null;
      snap.forEach(function(ss) {
        if( skipFirst ) {
          skipFirst = false;
          return;
        }
        self.keys.push(extractKey(ss, self.field));
      });
      if( killCount++ > 10000 ) {
        throw new Error('Tried to fetch more than 10,000 pages to determine the correct offset. Giving up now. Sorry.');
      }
      if( self.curr >= self.keys.length && snap.numChildren() === limit ) {
        // prevents recursive scoping
        setTimeout(util.bind(self._grow, self, callback), 0);
      }
      else {
        killCount = 0;
        util.log.debug('Offset._grow: Cached %d keys', self.keys.length);
        callback.call(self, !util.isEqual(self.getKey(), oldKey));
      }
    });
  }
  else {
    callback.call(self, false);
  }
};

Offset.prototype._startOffset = function() {
  return Math.max(0, this.curr - this.max, this.curr - 10);
};

Offset.prototype._queryRef = function() {
  var start = this._startOffset();
  var ref = this.ref;
  if( start > 0 ) {
    var key = this.getKey(start);
    ref = ref.startAt(key.val, key.key);
  }
  return ref.limitToLast(Math.max(this.curr - start, 1));
};

Offset.prototype._moved = function(snap) {
  if( snap.key() === this.getKey() ) {
    this._recache();
  }
};

Offset.prototype._unsubscribe = function() {
  if( this.sub ) {
    this.sub.off('child_added', this._recache, this);
    this.sub.off('child_moved', this._moved, this);
    this.sub.off('child_removed', this._recache, this);
    this.sub.off('value', this._doneSubscribing, this);
    this.sub = null;
  }
};

Offset.prototype._subscribe = function() {
  this._unsubscribe();
  this.sub = this._queryRef();
  this.isSubscribing = true;
  this.sub.on('child_added', this._recache, this);
  this.sub.on('child_moved', this._moved, this);
  this.sub.on('child_removed', this._recache, this);
  this.sub.once('value', this._doneSubscribing, this);
};

Offset.prototype._doneSubscribing = function() {
  this.isSubscribing = false;
  this._notify();
};

Offset.prototype._monitorEmptyOffset = function() {
  var self = this;
  var ref = self.ref;
  var key = null;
  function fn(snap) {
    var count = snap.numChildren();
    if( count > (key === null? 0 : 1) ) {
      util.log.debug('Offset._monitorEmptyOffset: A value exists now.');
      ref.off('value', fn);
      self._grow();
    }
  }
  if( this.keys.length ) {
    key = lastKey(this.keys);
    ref = ref.startAt(key.val, key.key);
  }
  util.log.debug('Offset._monitorEmptyOffset: No value exists at offset %d, currently %d keys at this path. Watching for a new value.', this.curr, this.keys.length);
  ref.limitToFirst(2).on('value', fn);
};

Offset.prototype._listen = function() {
  this._unsubscribe();
  if( this.curr >= this.keys.length ) {
    this._grow(function(/*changed*/) {
      if( this.keys.length >= this.curr ) {
        this._subscribe();
      }
      else {
        this._monitorEmptyOffset();
        this._notify();
      }
    });
  }
  else {
    this._subscribe();
  }
};

function extractKey(snap, field) {
  var v;
  switch(field) {
    case '$key':
      v = snap.key();
      break;
    case '$priority':
      v = snap.getPriority();
      break;
    case '$value':
      v = snap.val();
      break;
    default:
      var obj = snap.val();
      if( !util.isObject(obj) ) {
        throw new Error('A value of type ' + typeof obj + 'Was found. ' +
        'But we are attempting to order by child field "' + field + '". ' +
        'Pagination requires all records to be objects or it can\'t determine an ' +
        'appropriate offset value.');
      }
      else {
        v = obj[field];
      }
  }
  return {val: v, key: snap.key()};
}

function offsetRef(baseRef, startKey) {
  if( startKey === false ) {
    return null;
  }
  else if( startKey === null ) {
    return baseRef;
  }
  else {
    return baseRef.startAt(startKey.val, startKey.key);
  }
}

function baseRef(ref, field) {
  if( field === '$key' ) {
    return ref.orderByKey();
  }
  else if( field === '$priority' ) {
    return ref.orderByPriority();
  }
  else if( field === '$value' ) {
    return ref.orderByValue();
  }
  else {
    return ref.orderByChild(field);
  }
}

/**
 * A rudimentary debounce method
 * @param {function} fn the function to debounce
 * @param {object} [ctx] the `this` context to set in fn
 * @param {int} wait number of milliseconds to pause before sending out after each invocation
 * @param {int} [maxWait] max milliseconds to wait before sending out, defaults to wait * 10 or 100
 */
function debounce(fn, ctx, wait, maxWait) {
  var start, cancelTimer, args, runScheduledForNextTick;
  if( typeof(ctx) === 'number' ) {
    maxWait = wait;
    wait = ctx;
    ctx = null;
  }

  if( typeof wait !== 'number' ) {
    throw new Error('Must provide a valid integer for wait. Try 0 for a default');
  }
  if( typeof(fn) !== 'function' ) {
    throw new Error('Must provide a valid function to debounce');
  }
  if( !maxWait ) { maxWait = wait*10 || 100; }

  // clears the current wait timer and creates a new one
  // however, if maxWait is exceeded, calls runNow() on the next tick.
  function resetTimer() {
    if( cancelTimer ) {
      cancelTimer();
      cancelTimer = null;
    }
    if( start && Date.now() - start > maxWait ) {
      if(!runScheduledForNextTick){
        runScheduledForNextTick = true;
        setTimeout(runNow, 0);
      }
    }
    else {
      if( !start ) { start = Date.now(); }
      var to = setTimeout(runNow, wait);
      cancelTimer = function() { clearTimeout(to); };
    }
  }

  // Clears the queue and invokes the debounced function with the most recent arguments
  function runNow() {
    cancelTimer = null;
    start = null;
    runScheduledForNextTick = false;
    fn.apply(ctx, args);
  }

  function debounced() {
    args = Array.prototype.slice.call(arguments, 0);
    resetTimer();
  }
  debounced.running = function() {
    return start > 0;
  };

  return debounced;
}

function lastKey(list) {
  var len = list.length;
  return len? list[len-1] : null;
}

module.exports = Offset;