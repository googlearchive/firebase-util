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
    if( arguments.length === 3 && util.isObject(cancel) ) {
      context = cancel;
      cancel = util.undef;
    }

    function cancelHandler(err) {
      if( typeof(cancel) === 'function' && err !== null ) {
        cancel.call(context, err);
      }
    }

    this.$getRecord().watch(event, callback, cancelHandler, context);
    return callback;
  },

  'once': function(event, callback, cancel, context) {
    var self = this;
    if( arguments.length === 3 && util.isObject(cancel) ) {
      context = cancel;
      cancel = util.undef;
    }
    function successHandler(snap) {
      self.off(event, successHandler);
      callback.call(context, snap);
    }

    function cancelHandler(err) {
      if( typeof(cancel) === 'function' && err !== null ) {
        cancel.call(context, err);
      }
    }

    return this.on(event, successHandler, cancelHandler);
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

  'orderByValue': function() {
    return this.$replicate('orderByValue', util.toArray(arguments));
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

  /** @returns {Record} */
  '$getRecord': function() { return this._rec; },

  /** @return {Firebase} */
  '$getMaster': function() { return this._rec.getPathManager().first().ref(); },

  /** @return {Array} */
  '$getPaths': function() { return this._rec.getPathManager().getPaths(); },

  /**
   * @param {String} method
   * @param {Array|arguments} args
   * @returns {Query}
   */
  '$replicate': function(method, args) {
    var rec = this.$getRecord();
    var ref = this.$getMaster();
    ref = ref[method].apply(ref, args);
    return new Query(this._ref, Transmogrifier.replicate(rec, ref));
  }
};

util.registerFirebaseWrapper(Query);
module.exports = Query;