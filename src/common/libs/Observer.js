"use strict";
var _ = require('lodash');

/** Observer
 ***************************************************
 * @private
 * @constructor
 */
function Observer(observable, event, notifyFn, context, cancelFn, oneTimeEvent) {
  if( typeof(notifyFn) !== 'function' ) {
    throw new Error('Must provide a valid notifyFn');
  }
  this.observable = observable;
  this.fn = notifyFn;
  this.event = event;
  this.cancelFn = cancelFn||function() {};
  this.context = context;
  this.oneTimeEvent = !!oneTimeEvent;
}

Observer.prototype = {
  notify: function() {
    var args = _.toArray(arguments);
    this.fn.apply(this.context, args);
    if( this.oneTimeEvent ) {
      this.observable.stopObserving(this.event, this.fn, this.context);
    }
  },

  matches: function(event, fn, context) {
    if( _.isArray(event) ) {
      return _.contains(event, function(e) {
        return this.matches(e, fn, context);
      }, this);
    }
    return (!event || event === this.event)
      && (!fn || fn === this || fn === this.fn)
      && (!context || context === this.context);
  },

  notifyCancelled: function(err) {
    this.cancelFn.call(this.context, err||null, this);
  }
};

exports.Observer = Observer;