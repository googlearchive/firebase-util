'use strict';

var util = require('../../common');

function Filter() {
  this.criteria = [];
  util.each(arguments, this.add, this);
}

Filter.prototype = {
  add: function(fn) {
    this.criteria.push(
      new Condition(fn)
    );
  },
  test: function(snapshot) {
    return util.contains(this.criteria, function(cond) {
      return !cond.test(snapshot);
    }) === false;
  }
};

function Condition(fn) {
  this.match = fn;
}

Condition.prototype.test = function(snapshot) {
  return this.match(snapshot) === true;
};

module.exports = Filter;