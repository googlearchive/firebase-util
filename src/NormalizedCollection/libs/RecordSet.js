'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function RecordSet(pathManager, fieldMap, whereClause) {
  this.paths = pathManager;
  this.fields = fieldMap;
  this.filters = whereClause;
}
util.inherits(RecordSet, AbstractRecord, {
  child: function(key) {
    return Record(this.paths.child(key), this.fields);
  }

  //_start: function() {} //todo
  //_end:   function() {} //todo
  //toJSON: function() {} //todo
});

module.exports = RecordSet;