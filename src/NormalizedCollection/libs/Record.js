'use strict';

var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function Record(pathManager, fieldMap) {
  this._super(pathManager, fieldMap);
}

util.inherits(Record, AbstractRecord, {
  child: function(key) {
    var pathName = this.fields.pathFor(key) || this.paths.first().name();
    var path = this.paths.getPath(pathName);
    var pm = new PathManager([path.child(key)]);
    var fm = new FieldMap();
    fm.add(FieldMap.key(path.name(), key));
    return new Record(pm, fm);
  }

  //_start: function() {} //todo
  //_end:   function() {} //todo
  //toJSON: function() {} //todo
});

module.exports = Record;