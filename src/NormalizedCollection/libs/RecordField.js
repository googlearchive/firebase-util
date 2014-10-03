'use strict';

var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function RecordField(pathManager, fieldMap) {
  this._super(pathManager, fieldMap);
}

util.inherits(RecordField, AbstractRecord, {
  child: function(key) {
    var pm = new PathManager([this.pathMgr.first().child(key)]);
    var fm = new FieldMap(pm);
    fm.add(FieldMap.key(pm.first(), key));
    return new RecordField(pm, fm);
  },

  getChildSnaps: function(snapsArray, fieldName) {
    // there are no aliases at this level so fieldName === key
    return [snapsArray[0].child(fieldName)];
  },

  /**
   * Merge the data by iterating the snapshots in reverse order
   * so that keys from later paths do not overwrite keys from earlier paths
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
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

module.exports = RecordField;