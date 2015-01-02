'use strict';

var util = require('../../common');
var Transmogrifier = require('./Transmogrifier');

function Query(ref, record) {
  var self = this;
  self._ref = ref;
  self._rec = record;
  // necessary because util.inherit() can only call classes with an empty constructor
  // so we can't depend on the params existing for that call
  if( record ) { record.setRef(self); } //todo don't like this here, is awkward coupling
}

Query.prototype = {
  'on': function(event, callback, cancel, context) {
    this.$getRecord().watch(event, callback, cancel, context);
  },

  'once': function(event, callback, cancel, context) {
    function fn(snap) {
      this.off(event, fn, this);
      callback.call(context, snap);
    }
    this.on(event, fn, cancel, this);
  },

  'off': function(event, callback, context) {
    this.$getRecord().unwatch(event, callback, context);
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

  '$getRecord': function() { return this._rec; },

  '$getMaster': function() { return this._rec.getPathManager().first().ref(); },

  '$getPaths': function() { return this._rec.getPathManager().getPaths(); },

  '$replicate': function(method, args) {
    var rec = this.$getRecord();
    var ref = this.$getMaster();
    ref = ref[method].apply(ref, args);
    return new Query(this._ref, Transmogrifier.replicate(rec, ref));
  }
};

util.registerFirebaseWrapper(Query);
module.exports = Query;