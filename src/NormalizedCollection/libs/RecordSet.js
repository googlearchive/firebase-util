'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');
var PathManager = require('./PathManager');
var FieldMap = require('./FieldMap');

function RecordSet(fieldMap, whereClause) {
  this._super(fieldMap);
  this.filters = whereClause;
}

util.inherits(RecordSet, AbstractRecord, {
  child: function(key) {
    var fm = FieldMap.recordMap(this.map, key);
    return new Record(fm);
  },

  getChildSnaps: function(snapsArray, recordId) {
    var snaps = [];
    util.each(snapsArray, function(snap) {
      snaps.push(snap.child(recordId));
    });
    return snaps;
  },

  /**
   * Merge the data by iterating the snapshots and applying
   * the updates recursively so that the records are merged.
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(/*snaps, isExport*/) {
    //todo
    //todo use the field map to apply values
    //todo use the filters
    //todo
    //todo
  },

  _start: function() {}, //todo
  _end:   function() {}, //todo
  toJSON: function() {} //todo
});

module.exports = RecordSet;