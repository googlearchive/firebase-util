'use strict';

var util = require('../../common');
var Transmogrifier = require('./Transmogrifier');

function Query(ref, record) {
  var self = this;
  self._ref = ref;
  self._rec = record;
}

Query.prototype = {
  'on': function(event, callback, cancel, context) {
    this.$getRec().watch(event, callback, cancel, context);
  },

  'once': function(event, callback, cancel, context) {
    function fn(snap) {
      this.off(event, fn, this);
      callback.call(context, snap);
    }
    this.on(event, fn, cancel, this);
  },

  'off': function(event, callback, context) {
    this.$getRec().unwatch(event, callback, context);
  },

  /************************************
   * Wrapped functions
   ************************************/

  'orderByChild': function() {
    return this.$replicate('orderByChild', util.toArray(arguments));
  },

  'orderByKey': function() {
    return this.$replicate('orderByKey', util.toArray(arguments));
  },

  'orderByPriority': function() {
    return this.$replicate('orderByPriority', util.toArray(arguments));
  },

  'limitToFirst': function() {
    return this.$replicate('limitToFirst', util.toArray(arguments));
  },

  'limitToLast': function() {
    return this.$replicate('limitToLast', util.toArray(arguments));
  },

  /** @deprecated */
  'limit': function() {
    return this.$replicate('limit', util.toArray(arguments));
  },

  'startAt': function() {
    return this.$replicate('startAt', util.toArray(arguments));
  },

  'endAt': function() {
    return this.$replicate('endAt', util.toArray(arguments));
  },

  'equalTo': function() {
    return this.$replicate('equalTo', util.toArray(arguments));
  },

  'ref': function() { return this._ref; },

  /****************************
   * PACKAGE FUNCTIONS (not API)
   ***************************/

  '$getRec': function() { return this._rec; },

  '$replicate': function(method, args) {
    var rec = this._rec;
    var ref = rec.getPathManager().first().ref();
    ref = ref[method].apply(ref, args);
    return new Query(this._ref, Transmogrifier.replicate(rec, ref));
  }
};

util.registerFirebaseWrapper(Query);
module.exports = Query;