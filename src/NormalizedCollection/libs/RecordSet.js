'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');
var PathManager = require('./PathManager');

function RecordSet(pathManager, fieldMap, whereClause) {
  this._super(pathManager, fieldMap);
  this.filters = whereClause;
}

util.inherits(RecordSet, AbstractRecord, {
  child: function(key) {
    var paths = util.map(this.pathMgr.paths, function(p) {
      return p.child(key);
    });
    return new Record(new PathManager(paths), this.fields);
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