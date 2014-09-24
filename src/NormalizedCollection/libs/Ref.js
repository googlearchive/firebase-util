'use strict';

var util = require('../../common');
var Query = require('./Query.js');

function Ref(paths, fieldMap, whereClause) {}

util.inherits(Ref, Query, {
  'auth': function() {},
  'unauth': function() {},
  'child': function() {},
  'parent': function() {},
  'root': function() {},
  'name': function() {},
  'toString': function() {},
  'set': function() {},
  'update': function() {},
  'remove': function() {},
  'push': function() {},
  'setWithPriority': function() {},
  'setPriority': function() {},
  'transaction': function() {},
  'goOffline': function() {},
  'goOnline': function() {}
});

module.exports = Ref;