'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');
var FieldMap = require('./FieldMap');
var RecordSetEventManager = require('./RecordSetEventManager');

function RecordSet(fieldMap, whereClause) {
  this._super(fieldMap);
  this.filters = whereClause;
  this.monitor = new RecordSetEventManager(this);
}

util.inherits(RecordSet, AbstractRecord, {
  child: function(key) {
    var fm = FieldMap.recordMap(this.map, key);
    return new Record(fm);
  },

  /**
   * Override AbstractRecord's hasChild since we are dealing
   * with record ids at this level. We use the master list to determine
   * if records exist, so it's a pretty straightforward hasChild
   * on the first snapshot.
   *
   * @param {Array} snaps a list of array snapshots to test for child
   * @param {string} key
   */
  hasChild: function(snaps, key) {
    return snaps[0].hasChild(key);
  },

  getChildSnaps: function(snapsArray, recordId) {
    var self = this;
    return util.map(snapsArray, function(snap) {
      var key = self._getChildKey(snap, snapsArray, recordId);
      return key === null? null : snap.child(key);
    });
  },

  /**
   * Merge the data by iterating the snapshots and applying
   * the updates recursively so that the records are merged.
   *
   * Assumes that all dependency graphs have been resolved and
   * the correct snapshots have been provided.
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    var self = this;
    var out = {};
    var firstSnap = snaps[0];
    // iterate each record and then merge the children
    firstSnap.forEach(function(ss) {
      var childSnaps = self.getChildSnaps(snaps, ss.name());
      var fm = FieldMap.recordMap(self.map, ss.name());
      var data = util.extend.apply(null, util.map(childSnaps, function(cs) {
        if( cs !== null ) {
          return fm.extractData(cs, isExport);
        }
      }));
      if( self.filters.test(data, ss.name(), ss.getPriority()) ) {
        out[ss.name()] = data;
      }
    });
    if( isExport && firstSnap.getPriority() !== null ) {
      out['.priority'] = firstSnap.getPriority();
    }
    return out;
  },

  /**
   * Given a list of snapshots to iterate, returns the valid keys
   * which exist in both the snapshots and the field map, in the
   * order they should be iterated.
   *
   * Calls iterator with a {string|number} key for the next field to
   * iterate only.
   *
   * If iterator returns true, this method should abort and return true,
   * otherwise it should return false (same as Snapshot.forEach).
   *
   * @param {Array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @return {boolean} true if aborted
   * @abstract
   */
  forEachKey: function(snaps, iterator, context) {
    snaps[0].forEach(function(snap) {
      return iterator.call(context, snap.name(), snap.name());
    });
  },

  /**
   * Return the correct child key for a snapshot by determining if its corresponding path
   * has dependencies. If so, we look up the id and return that child, otherwise, we just
   * return the child for the recordId.
   *
   * If a dependency exists, but the required field is null or invalid, then we just return
   * null in place of the snapshot.
   *
   * @private
   */
  _getChildKey: function(snap, snapsArray, recordId) {
    var key = recordId;
    var dep = this.map.getPathManager().getPathFor(snap.ref().toString()).getDependency();
    // resolve any dependencies to determine the child key's value
    if( dep !== null ) {
      var path = this.map.getPath(dep.path);
      if( !path ) {
        throw new Error('Invalid dependency path. ' + snap.ref.toString()
        + ' depends on ' + dep.path
        + ', but that alias does not exist in the paths provided.');
      }
      var depField = this.map.getField(dep.field);
      if( !depField ) {
        depField = {id: dep.field, alias: dep.field};
      }
      var depSnap = util.find(snapsArray, function(snap) {
        return snap.ref().toString() === path.url();
      }).child(recordId).child(depField.id);
      key = depSnap.val();
    }
    return key;
  },

  _start: function(event) {
    this.monitor.start(event);
  },

  _stop:   function(event) {
    this.monitor.stop(event);
  }
});

module.exports = RecordSet;