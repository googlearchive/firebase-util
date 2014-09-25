'use strict';

var util      = require('../../common');
var Query     = require('./Query');
var RecordSet = require('./RecordSet');

function Ref(record, parent) {
  this._parent = parent||null;
  this._super(this, record);
}

util.inherits(Ref, Query, {
  'child': function(key) {
    var record = this._record.child(key);
    return new Ref(record, this);
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

  'name': function() {
    return '[' + util.map(this.paths, function(p) {
      return p.name();
    }).join('][') + ']';
  },

  'toString': function() {
    return '[' + util.map(this.paths, function(p) {
      return p.reff().toString();
    }).join('][') + ']';
  },

  'set': function() {},

  'update': function() {},

  'remove': function() {},

  'push': function() {},

  'setWithPriority': function() {},

  'setPriority': function() {},

  /****************************
   * UNSUPPORTED FUNCTIONS
   ***************************/
  'auth': notSupported('auth'),
  'unauth': notSupported('unauth'),
  'transaction': notSupported('transaction'),
  'goOffline': notSupported('goOffline'),
  'goOnline': notSupported('goOnline'),
  'onDisconnect': notSupported('onDisconnect')
});

function notSupported(method) {
  return function() {
    throw new Error(method + ' is not supported for NormalizedCollection references');
  }
}

module.exports = Ref;