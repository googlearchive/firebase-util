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
  test: function(snapshot) {
    console.log('contains?', util.contains(this.criteria, function(cond) {
      return !cond.test(snapshot);
    })); //debug
    return util.contains(this.criteria, function(cond) {
      return !cond.test(snapshot);
    }) === false;
  }
};

function Condition(field, operator, match) {
  this.field = field;
  this.operator = operator;
  this.match = match;
  this.test = createMatchFunction(field, operator, match);
}

function createMatchFunction(field, operator, match) {
  switch(operator) {
    case OP.EQUALS:
      return function(snapshot) {
        return extract(field, snapshot) === match;
      };
    case OP.NOT_EQUALS:
      return function(snapshot) {
        return extract(field, snapshot) !== match;
      };
    case OP.NULL:
      return function(snapshot) {
        console.log('testing', field, operator, match, snapshot.getPriority(), extract(field, snapshot), extract(field, snapshot) === match); //debug

        return extract(field, snapshot) === null;
      };
    case OP.NOT_NULL:
      return function(snapshot) {
        return extract(field, snapshot) !== null;
      };
    case OP.GT:
      return function(snapshot) {
        return extract(field, snapshot) > match;
      };
    case OP.GTE:
      return function(snapshot) {
        return extract(field, snapshot) >= match;
      };
    case OP.LT:
      return function(snapshot) {
        return extract(field, snapshot) < match;
      };
    case OP.LTE:
      return function(snapshot) {
        return extract(field, snapshot) <= match;
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

function extract(field, snapshot) {
  if( field === '$key' ) { return snapshot.name(); }
  if( field === '$priority' ) { return snapshot.getPriority(); }
  else {
    // snapshot.val() can be expensive so wait to call it
    // and only call it once here
    var data = snapshot.val();
    if (util.has(data, field)) {
      return data[field];
    }
    else {
      return null; // because there is no undef for Firebase
    }
  }
}

module.exports = WhereClause;