'use strict';

var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');
var RecordField = require('./RecordField');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function Record(pathManager, fieldMap) {
  this._super(pathManager, fieldMap);
}

util.inherits(Record, AbstractRecord, {
  child: function(key) {
    var pm = new PathManager([this.map.pathFor(key)]);
    var fm = new FieldMap(pm);
    fm.add(FieldMap.key(pm.first(), key));
    return new RecordField(pm, fm);
  },

  getChildSnaps: function(snapsArray, fieldName) {
    var pathUrl = this.map.pathFor(fieldName).url();
    var snap = util.find(snapsArray, function(ss) {
      return ss.ref().ref().toString() === pathUrl;
    }) || snapsArray[0];
    return [snap];
  },

  /**
   * Merge the data by iterating the snapshots in reverse order
   * so that keys from later paths do not overwrite keys from earlier paths
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(/*snaps, isExport*/) {
    //todo
    //todo use the field map to apply values
    //todo
    //todo
    //todo
  },

  _start: function() {}, //todo
  _end:   function() {}, //todo
  toJSON: function() {} //todo
});

module.exports = Record;