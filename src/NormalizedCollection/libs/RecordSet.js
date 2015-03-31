'use strict';

var Record = require('./Record');
var AbstractRecord = require('./AbstractRecord');
var util = require('../../common');
var FieldMap = require('./FieldMap');
var RecordSetEventManager = require('./RecordSetEventManager');

/**
 * A "Record" (see AbstractRecord) represents a merged set of data used by NormalizedRef.
 * It is used by NormalizedRef to create snapshots and monitor Firebase for data changes.
 *
 * A RecordSet represents the root level of NormalizedCollection's output. It is a list of
 * collections (from multiple paths in Firebase) to be joined together.
 *
 * This is, for the purposes of a NormalizedCollections, the root of the data. Calls to parent()
 * from here should return null, just like they would from the root of a Firebase. This is because
 * the parent of a normalized collection is ambiguous, so there is no higher level of data.
 *
 * @param fieldMap this is the field map to be applied to each Record created when calling child()
 * @param whereClause this filters the output data and events
 * @constructor
 */
function RecordSet(fieldMap, whereClause) {
  var name = util.mergeToString(fieldMap.getPathManager().getPathNames());
  var url = util.mergeToString(fieldMap.getPathManager().getUrls());

  // AbstractRecord makes this observable and abstracts some common impl details
  // between RecordSet, Record, and RecordField
  this._super(fieldMap, name, url);

  // Used to filter the merged data and determine which merged Records should trigger events and
  // which ones should be ignored
  this.filters = whereClause;

  // the RecordSetEventManager handles Firebase events and calls event handlers on
  // this RecordSet appropriately. See RecordSetEventManager for more details
  this.monitor = new RecordSetEventManager(this);
}

util.inherits(RecordSet, AbstractRecord, {
  makeChild: function(key) {
    var fm = FieldMap.recordMap(this.getFieldMap(), key);
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
    return util.contains(snaps, function(s) {
      return s.key() === key;
    });
  },

  getChildSnaps: function(snapsArray, recordId) {
    return util.filter(snapsArray, function(s) {
      return s.key() === recordId;
    });
  },

  /**
   * Since the snapshots attached to this level are records, there isn't much
   * to do for a merge. Just put them all together.
   *
   * @param {Array} snaps list of snapshots to be merged
   * @param {boolean} isExport true if exportVal() was called
   * @returns {Object}
   */
  mergeData: function(snaps, isExport) {
    var self = this;
    var out = {};
    util.each(snaps, function(snap) {
      if( self.filters.test(snap.val(), snap.key(), snap.getPriority()) ) {
        out[snap.key()] = isExport? snap.exportVal() : snap.val();
      }
    });
    return out;
  },

  getPriority: function() {
    return null;
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
    snaps.forEach(function(snap) {
      return iterator.call(context, snap.key(), snap.key());
    });
  },

  getClass: function() { return RecordSet; },

  /**
   * Saving a record set is done by grabbing each child record and calling save against that.
   * This is the easiest approach since we must distribute fields to each appropriate path.
   * It might be more efficient to bulk these into a single write op, and perhaps we should
   * explore that if this proves to be slow.
   *
   * @param data
   * @param {Object} opts
   */
  saveData: function(data, opts) {
    var q = util.queue();
    if( data === null ) {
      util.each(this.getPathManager().getPaths(), function(path) {
        path.ref().remove(q.getHandler());
      });
    }
    else if( !util.isObject(data) ) {
      throw new Error('Calls to set() or update() on a NormalizedCollection must pass either ' +
          'null or an object value. There is no way to split a primitive value between the paths');
    }
    else {
      util.each(data, function(v, k) {
        if( k === '.value' || k === '.priority' ) {
          throw new Error('Cannot use .priority or .value on the root path of a NormalizedCollection. ' +
              'You probably meant to sort the records anyway (i.e. one level lower).');
        }
        this.child(k).saveData(v, {isUpdate: opts.isUpdate, callback: q.getHandler()});
      }, this);
      if( opts.priority ) {
        this.getPathManager().first().ref().setPriority(opts.priority, q.getHandler());
      }
    }
    q.handler(opts.callback||util.noop, opts.context);
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
    var path = this.getPathManager().getPathFor(snap.ref().toString());
    // resolve any dependencies to determine the child key's value
    if( path.hasDependency() ) {
      var dep = path.getDependency();
      var depPath = this.getFieldMap().getPath(dep.path);
      if( !depPath ) {
        throw new Error('Invalid dependency path. ' + snap.ref.toString() +
        ' depends on ' + dep.path +
        ', but that alias does not exist in the paths provided.');
      }
      var depSnap = util.find(snapsArray, function(snap) {
        return snap.ref().toString() === depPath.url();
      });
      if( depSnap ) {
        depSnap = depSnap.child(recordId);
        if( dep.field !== '$value' ) {
          depSnap = depSnap.child(dep.field);
        }
        key = depSnap.val();
      }
      else {
        key = null;
      }
    }
    return key;
  },

  _start: function() {
    this.monitor.start();
  },

  _stop:   function(event, count) {
    if( count === 0 ) { this.monitor.stop(); }
  }
});

module.exports = RecordSet;