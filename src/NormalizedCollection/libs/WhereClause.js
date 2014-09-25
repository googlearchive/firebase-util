'use strict';

var util = require('../../common');
var OP = require('./constants.js');

function WhereClause(fieldMap) {
  this.fields = fieldMap;
  this.criteria = [];
}

WhereClause.prototype = {
  add: function(field, operator, match) {
    this.criteria.push(
      new Condition(field, operator, match)
    );
  },
  matches: function(snapshot) {
    return util.contains(this.criteria, function(cond) {
      return cond.test(snapshot.name(), snapshot.val());
    }) === false;
  }
};

function Condition(field, operator, match) {
  this.field = field;
  this.operator = operator;
  this.test = createMatchFunction(field, operator, match);
}

function createMatchFunction(field, operator, match) {
  switch(operator) {
    case OP.EQUALS:
      return function(key, data) {
        return extract(field, key, data) === match;
      };
    case OP.NOT_EQUALS:
      return function(key, data) {
        return extract(field, key, data) !== match;
      };
    case OP.NULL:
      return function(key, data) {
        return extract(field, key, data) === null;
      };
    case OP.NOT_NULL:
      return function(key, data) {
        return extract(field, key, data) !== null;
      };
    case OP.GT:
      return function(key, data) {
        return extract(field, key, data) > match;
      };
    case OP.GTE:
      return function(key, data) {
        return extract(field, key, data) >= match;
      };
    case OP.LT:
      return function(key, data) {
        return extract(field, key, data) < match;
      };
    case OP.LTE:
      return function(key, data) {
        return extract(field, key, data) <= match;
      };
    case OP.FUNCTION:
      if( typeof match !== 'function' ) {
        throw new Error('where() comparator was Firebase.util.FUNCTION, but match' +
          ' argument was a ' +typeof match);
      }
      return match;
    default:
      throw new Error('Invalid comparator '+operator+', must be one of the Firebase.util' +
        ' constants (EQUALS, NOT_EQUALS, NULL, NOT_NULL, GT, GTE, LT, LTE, or FUNCTION)');
  }
}

function extract(field, key, data) {
  if( field === '$key' ) { return key; }
  else if( util.has(data, field) ) {
    return data[field];
  }
  else {
    return null;
  }
}

module.exports = WhereClause;