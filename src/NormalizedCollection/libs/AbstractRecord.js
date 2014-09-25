'use strict';

function AbstractRecord(pathManager, fieldMap, whereClause) {
  this.paths = pathManager;
  this.fields = fieldMap;
  this.filters = whereClause;
}

AbstractRecord.prototype = {
  watch: function() {}, //todo
  unwatch: function() {}, //todo

  /** @abstract */
  _start: abstract('start'),

  /** @abstract */
  _stop:  abstract('stop'),

  /** @abstract */
  toJSON: abstract('toJSON')
};

function abstract(method) {
  return function() {
    throw new Error('Classes implementing AbstractRecord must declare ' + method);
  };
}

module.exports = AbstractRecord;