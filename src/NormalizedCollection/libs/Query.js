'use strict';

var RecordSet = require('./RecordSet');
var Record = require('./Record');

function Query(ref, record) {
  this._ref = ref;
  this._record = record;
}

Query.prototype = {
  'on': function() {},
  'once': function() {},
  'off': function() {},
  'limit': function() {},
  'startAt': function() {},
  'endAt': function() {},
  'equalTo': function() {},
  'ref': function() { return this._ref; }
};

module.exports = Query;