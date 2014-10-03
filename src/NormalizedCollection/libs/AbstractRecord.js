'use strict';

function AbstractRecord(pathManager, fieldMap) {
  this.pathMgr = pathManager;
  this.map = fieldMap;
}

AbstractRecord.prototype = {
  /** @abstract */
  _start: abstract('start'),

  /** @abstract */
  _stop:  abstract('stop'),

  /** @abstract */
  toJSON: abstract('toJSON'),

  /** @abstract */
  getChildSnaps: abstract('getChildSnaps'),

  /* @abstract */
  mergeData: abstract('mergeData'),

  watch: function() {}, //todo
  unwatch: function() {}, //todo

  getFieldMap: function() {
    return this.map;
  }
};

function abstract(method) {
  return function() {
    throw new Error('Classes implementing AbstractRecord must declare ' + method);
  };
}

module.exports = AbstractRecord;