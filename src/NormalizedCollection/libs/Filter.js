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
  test: function(recordData, key, priority) {
    return util.contains(this.criteria, function(cond) {
      return !cond.test(recordData, key, priority);
    }) === false;
  }
};

function Condition(fn) {
  this.match = fn;
}

Condition.prototype.test = function(data, key, priority) {
  return this.match(data, key, priority) === true;
};

module.exports = Filter;