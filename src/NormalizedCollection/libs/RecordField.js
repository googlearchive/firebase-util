'use strict';

var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');

function RecordField(pathManager, fieldMap) {
  this._super(pathManager, fieldMap);
  this.path = pathManager.first();
}

util.inherits(RecordField, AbstractRecord, {
  child: function(key) {
    var pm = new PathManager([this.path.child(key)]);
    var fm = new FieldMap(pm);
    fm.add({key: FieldMap.key(pm.first(), '$value'), alias: key});
    return new RecordField(pm, fm);
  },

  getChildSnaps: function(snapsArray, fieldName) {
    // there are no aliases at this level so fieldName === key
    return [snapsArray[0].child(fieldName)];
  },

  /**
   * There is nothing to merge at this level because there is only one
   * path and no field map
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    if( snaps.length !== 1 ) {
      throw new Error('RecordField must have exactly one snapshot, but we got '+snaps.length);
    }
    return isExport? snaps[0].exportVal() : snaps[0].val();
  },

  _start: function(event) {
    this.path.ref().on(event, this._handler(event), this._cancel, this);
  },

  _end:   function(event) {
    this.path.ref().off(event, this._handler(event), this);
  }
});

module.exports = RecordField;