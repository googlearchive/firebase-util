'use strict';

var util = require('../../common');
var OP = require('./constants.js');

function WhereClause() {
  this.criteria = [];
}

WhereClause.prototype = {
  add: function(field, operator, match) {
    this.criteria.push(
      new Condition(field, operator, match)
    );
  },
  matches: function(record) {
    return util.contains(this.criteria, function(cond) {
      return !cond.test(record);
    }) === false;
  }
};

function Condition(field, operator, match) {
  this.field = field;
  this.operator = operator;
  this.match = match;
}

Condition.prototype = {
  test: function(data) {
    return false; //todo
  }
};

module.exports = WhereClause;