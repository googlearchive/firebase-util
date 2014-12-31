'use strict';

var util      = require('../../common');
var Query     = require('./Query');
var Path      = require('./Path');

function NormalizedRef(record, parent) {
  this._super(this, record);
  var paths = record.getPathManager().getPaths();
  this._parent = parent||null;
  this._key = _key(paths);
  this._toString = _toString(paths);
}

util.inherits(NormalizedRef, Query, {
  'child': function(fieldName) {
    var record = this._rec.child(fieldName);
    return new NormalizedRef(record, this);
  },

  'parent': function() {
    return this._parent;
  },

  'root': function() {
    var p = this;
    while(p.parent() !== null) {
      p = p.parent();
    }
    return p;
  },

  /** @deprecated */
  'name': function() {
    console.warn('The name() function has been deprecated. Use key() instead.');
    return this.key();
  },

  'key': function() {
    return this._key;
  },

  'toString': function() {
    return this._toString;
  },

  'set': function() {}, //todo

  'update': function() {}, //todo

  'remove': function() {}, //todo

  'push': function() {}, //todo

  'setWithPriority': function() {}, //todo

  'setPriority': function() {}, //todo

  /****************************
   * WRAPPER FUNCTIONS
   ****************************/
  'auth': wrapMaster('auth'),
  'unauth': wrapMaster('unauth'),
  'authWithCustomToken': wrapMaster('authWithCustomToken'),
  'authAnonymously': wrapMaster('authAnonymously'),
  'authWithPassword': wrapMaster('authWithPassword'),
  'authWithOAuthPopup': wrapMaster('authWithOAuthPopup'),
  'authWithOAuthRedirect': wrapMaster('authWithOAUthRedirect'),
  'authWithOAuthToken': wrapMaster('authWithOAuthToken'),
  'getAuth': wrapMaster('getAuth'),
  'onAuth': wrapMaster('onAuth'),
  'offAuth': wrapMaster('offAuth'),
  'createUser': wrapMaster('createUser'),
  'changePassword': wrapMaster('changePassword'),
  'removeUser': wrapMaster('removeUser'),
  'resetPassword': wrapMaster('resetPassword'),

  'goOffline': wrapAll('goOffline'),
  'goOnline': wrapAll('goOnline'),

  /****************************
   * UNSUPPORTED FUNCTIONS
   ***************************/
  'transaction': notSupported('transaction'), //todo use field map to pick fields and apply to each
  'onDisconnect': notSupported('onDisconnect') //todo use field map to pick fields and apply to each
});

function wrapAll(method) {
  return function() {
    var args = util.toArray(arguments);
    util.each(this.$getRecord().getPathManager().getPaths(), function(p) {
      var ref = p.ref();
      ref[method].apply(ref, args);
    });
  }
}

function wrapMaster(method) {
  return function() {
    var args = util.toArray(arguments);
    var ref = this.$getRecord().getPathManager().first().ref();
    ref[method].apply(ref, args);
  }
}

function notSupported(method) {
  return function() {
    throw new Error(method + ' is not supported for NormalizedCollection references. ' +
      'Try calling it on the original reference used to create the NormalizedCollection instead.');
  };
}

function _key(paths) {
  if( paths.length > 1 ) {
    return '[' + util.map(paths, function(p) {
      return p.name();
    }).join('][') + ']';
  }
  else {
    return paths[0].name();
  }
}

function _toString(paths) {
  return paths.length > 1? '[' + util.map(paths, function(p) {
    return p.url();
  }).join('][') + ']' : paths[0].url();
}

module.exports = NormalizedRef;