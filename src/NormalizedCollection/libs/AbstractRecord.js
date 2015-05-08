'use strict';

var util = require('../../common/');

/**
 * A Record represents a set of merged data. The hierarchy of a normalized Collection
 * can be traversed as normal using parent() and child() calls:
 *    - RecordSet: The root of a normalized collection; a set of merged Firebase paths
 *    - Record: A child of RecordSet obtained by calling .child(recordId)
 *    - RecordField: A child of Record or RecordField which represents a wrapped Firebase path (no longer normalized)
 *
 * We wrap all of these levels, including the RecordField's, so that the
 * parent() and child() calls work as expected and return the normalized chain instead
 * of reverting to the underlying Firebase instances.
 *
 * AbstractRecord provides common functionality around observables, event handling, and field maps
 * used by all three implementations.
 *
 * @param fieldMap the field map applied to Record objects
 * @param {String} name
 * @param {String} url
 * @constructor
 */
function AbstractRecord(fieldMap, name, url) {
  var self = this;
  self._ref = null;
  self._map = fieldMap;
  self._name = name;
  self._url = url;
  self.lastMergedValue = util.undef; // starts undefined since first value may be null
  self._obs = new util.Observable(
    ['child_added', 'child_removed', 'child_changed', 'child_moved', 'value'],
    {
      onAdd: function(event) {
        var count = self._obs.getObservers(event).length;
        if( count === 1 ) {
          self._start(event, self._obs.getObservers().length);
        }
      },
      onRemove: function(event) {
        var count = self._obs.getObservers(event).length;
        if( count === 0 ) {
          self._stop(event, self._obs.getObservers().length);
        }
      }
    }
  );
}

AbstractRecord.prototype = {
  /**
   * Called internally by AbstractRecord whenever the first listener
   * is attached for a given event. Also includes a count of the
   * total number of listeners
   *
   * @param {string} type
   * @param {int} totalListeners
   * @abstract
   */
  _start: abstract('_start'),

  /**
   * Called internally by AbstractRecord whenever
   * the last listener is detached for a given type. Also provides
   * the total listener count
   *
   * @param {string} type
   * @param {int} totalListeners
   * @abstract
   */
  _stop:  abstract('_stop'),

  /**
   * Should return true if the snapshots provided contain the child key and if it
   * exists in the fields for this record type.
   *
   * @param {Array} snapshots
   * @param {string} key
   * @abstract
   */
  hasChild: abstract('hasChild'),

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
  forEachKey: abstract('forEach'),

  /**
   * When .child() is called on a Snapshot, this will reconcile
   * the correct refs and data for each child and return an array
   * containing the child snapshots for the specified key. For
   * a RecordSet, this should return children for all the fields
   * in the field map. For a Record, this should return a child
   * from the correct snapshot, or the first if the child is not
   * in the map.
   *
   * @param {Array} snaps
   * @param {string} key
   * @abstract
   */
  getChildSnaps: abstract('getChildSnaps'),

  /**
   * This should take all the data from a set of snapshots and
   * merge it together appropriately. For a RecordSet, this should
   * return records ordered by the first reference. For a Record,
   * this should return the fields in the field map.
   *
   * @param {Array} snaps
   * @param {boolean} isExport
   * @abstract
   */
  mergeData: abstract('mergeData'),

  /**
   * Returns the specific implementing class for this instance.
   *
   * @returns {Function}
   */
  getClass: abstract('getClass'),

  /**
   * Saves data back to the correct paths
   *
   * @param data
   * @param {Object} props an object with callback[, context][, isUpdate]
   */
  saveData: abstract('saveData'),

  /**
   * Returns the priority for a given set of snapshots
   * @param {Array} snapshots
   * @return {int|string}
   */
  getPriority: abstract('getPriority'),

  /**
   * This returns the appropriate AbstractRecord type in the chain. Note that references
   * created here will not be usable until setRef() is called, so this should only be used
   * for passing into a Query. Use .child() for everything else.
   *
   * @param {String} childName
   * @return {AbstractRecord}
   */
  makeChild: abstract('makeChild'),

  /**
   * @param {string} event
   * @param {function} callback
   * @param {function} [cancel]
   * @param {object} [context]
   */
  watch: function(event, callback, cancel, context) {
    this._obs.observe(event, callback, cancel, context);
  },

  /**
   * @param {string} event
   * @param {function} [callback]
   * @param {object} [context]
   */
  unwatch: function(event, callback, context) {
    this._obs.stopObserving(event, callback, context);
  },

  getFieldMap: function() {
    return this._map;
  },

  getPathManager: function() {
    return this._map.getPathManager();
  },

  setRef: function(ref) {
    this._ref = ref;
  },

  getRef: function() {
    return this._ref;
  },

  /**
   * @param {String} key
   * @returns {Record}
   */
  child: function(key) {
    return this.getRef().ref().child(key).$getRecord();
  },

  /**
   * Returns an appropriate path name or merged set of names for this record type.
   * @return {String}
   */
  getName: function() {
    return this._name;
  },

  /**
   * Returns a Firebase URL or a merged set of URLs for the Record
   * @return {String}
   */
  getUrl: function() {
    return this._url;
  },

  trigger: function(snapshotFactory) {
    util.log.debug('AbstractRecord._trigger: %s', snapshotFactory.toString());
    this._obs.triggerEvent(snapshotFactory.event, snapshotFactory.create(this.getRef()));
  },

  /**
   * @param {object} error
   */
  _cancel: function(error) {
    util.error(error);
    this._obs.abortObservers(error);
  }
};

function abstract(method) {
  return function() {
    throw new Error('Classes implementing AbstractRecord must declare ' + method);
  };
}

module.exports = AbstractRecord;