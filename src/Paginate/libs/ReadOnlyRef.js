'use strict';
var util      = require('../../common');

function ReadOnlyRef(ref) {
  this._ref = ref;
  this._obs = new util.Observable(
    ['value', 'child_added', 'child_removed', 'child_moved', 'child_changed'],
    {
      onAdd: function(event) {},
      onRemove: function(event) {}
    }
  );
}


ReadOnlyRef.prototype = {
  'on': function(event, callback, cancel, context) {
    this._obs.observe(event, callback, cancel, context);
  },

  'once': function(event, callback, cancel, context) {
    function fn(snap) {
      /*jshint validthis:true */
      this.off(event, fn, this);
      callback.call(context, snap);
    }
    this.on(event, fn, cancel, this);
  },

  'off': function(event, callback, context) {
    this._obs.stopObserving(event, callback, context);
  },

  /****************************
   * WRAPPER FUNCTIONS
   ****************************/
  'ref': function() {
    return this._ref;
  },
  'child': wrapMaster('child'),
  'parent': wrapMaster('parent'),
  'root': wrapMaster('root'),
  'name': wrapMaster('name'),
  'key': wrapMaster('key'),
  'toString': wrapMaster('toString'),

  'auth': wrapMaster('auth'),
  'unauth': wrapMaster('unauth'),
  'authWithCustomToken': wrapMaster('authWithCustomToken'),
  'authAnonymously': wrapMaster('authAnonymously'),
  'authWithPassword': wrapMaster('authWithPassword'),
  'authWithOAuthPopup': wrapMaster('authWithOAuthPopup'),
  'authWithOAuthRedirect': wrapMaster('authWithOAuthRedirect'),
  'authWithOAuthToken': wrapMaster('authWithOAuthToken'),
  'getAuth': wrapMaster('getAuth'),
  'onAuth': wrapMaster('onAuth'),
  'offAuth': wrapMaster('offAuth'),
  'createUser': wrapMaster('createUser'),
  'changePassword': wrapMaster('changePassword'),
  'removeUser': wrapMaster('removeUser'),
  'resetPassword': wrapMaster('resetPassword'),
  'changeEmail': wrapMaster('changeEmail'),

  'goOffline': wrapMaster('goOffline'),
  'goOnline': wrapMaster('goOnline'),

  /****************************
   * UNSUPPORTED FUNCTIONS
   ***************************/
  'set': isReadOnly('set'),
  'update': isReadOnly('update'),
  'remove': isReadOnly('remove'),
  'push': isReadOnly('push'),
  'setWithPriority': isReadOnly('setWithPriority'),
  'setPriority': isReadOnly('setPriority'),
  'transaction': isReadOnly('transaction'),

  /** @deprecated */
  'limit': notSupported('limit'),

  'onDisconnect': notSupported('onDisconnect'),
  'orderByChild': notSupported('orderByChild'),
  'orderByKey': notSupported('orderByKey'),
  'orderByPriority': notSupported('orderByPriority'),
  'limitToFirst': notSupported('limitToFirst'),
  'limitToLast': notSupported('limitToLast'),
  'startAt': notSupported('startAt'),
  'endAt': notSupported('endAt'),
  'equalTo': notSupported('equalTo'),

  /** INTERNAL METHODS */
  $trigger: function() {
    this._obs.triggerEvent.apply(this._obs, util.toArray(arguments));
  }
};

function wrapMaster(method) {
  return function() {
    var args = util.toArray(arguments);
    var ref = this.ref();
    return ref[method].apply(ref, args);
  };
}

function isReadOnly(method) {
  return function() {
    throw new Error(method + ' is not supported. This is a read-only reference. You can ' +
    'modify child records after calling .child(), or work with the original by using .ref().');
  };
}

function notSupported(method) {
  return function() {
    throw new Error(method + ' is not supported for Paginate and Scroll references. ' +
    'Try calling it on the original reference used to create the instance instead.');
  };
}

exports.ReadOnlyRef = ReadOnlyRef;