'use strict';

function AbstractRecord(pathManager, fieldMap, whereClause) {
  this.paths = pathManager;
  this.fields = fieldMap;
  this.filters = whereClause;
}

AbstractRecord.prototype = {
  watch: function() {},
  unwatch: function() {},
  toJSON: function() {}
};

module.exports = AbstractRecord;