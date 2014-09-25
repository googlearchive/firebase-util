'use strict';

var util = require('../../common');

function Snapshot(ref, pri, data) {
  this._ref = ref;
  this._pri = pri;
  this._data = data;
}

Snapshot.prototype = {
  val: function() { return util.deepCopy(data); },
  child: function(key) {
    return new Snapshot(
      this._ref.child(key),
      null,
      util.has(this._data, key)? util.deepCopy(this._data[key]) : null
    )
  },
  forEach: function(cb, context) {
    util.each(this._data, cb, context);
  },
  hasChild: function(key) {
    return util.has(this._data, key);
  },
  hasChildren: function() {
    return util.isObject(this._data) && !util.isEmpty(this._data);
  },
  name: function() {
    return this._ref.ref().name();
  },
  numChildren: function() {
    if( util.isArray(this._data) ) {
      return this._data.length;
    }
    else if( util.isObject(this._data) ) {
      return util.keys(this._data).length;
    }
    else {
      return 0;
    }
  },
  ref: function() { return this._ref; },
  getPriority: function() { return this._pri; },
  exportVal: function() {
    var out = util.isObject(this._data)? util.deepCopy(data) : {'.value': this._data};
    if( this._pri !== null ) {
      out['.priority'] = this._pri;
    }
    return out;
  }
};

module.exports = Snapshot;