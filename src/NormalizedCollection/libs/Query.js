'use strict';

function Query(ref) {
  this._ref = ref;
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