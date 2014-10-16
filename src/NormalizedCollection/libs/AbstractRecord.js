'use strict';

var util = require('../../common/');

function AbstractRecord(pathManager, fieldMap) {
  var self = this;
  self.pathMgr = pathManager;
  self.map = fieldMap;
  self.obs = new util.Observable(
    ['value', 'child_added', 'child_removed', 'child_moved', 'child_updated'],
    {
      onAdd: function(event) {
        var count = self.obs.getObservers(event).length;
        if( count === 1 ) {
          self._start(event, self.obs.getObservers().length);
        }
      },
      onRemove: function(event) {
        var count = self.obs.getObservers(event).length;
        if( count === 0 ) {
          self._stop(event, self.obs.getObservers().length);
        }
      }
    }
  );
  self.eventHandlers = {
    'value': util.bind(self._trigger, self, 'value'),
    'child_added': util.bind(self._trigger, self, 'child_added'),
    'child_changed': util.bind(self._trigger, self, 'child_changed'),
    'child_removed': util.bind(self._trigger, self, 'child_removed'),
    'child_moved': util.bind(self._trigger, self, 'child_moved')
  };
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
   * Should return true if the field map for this record includes
   * the fieldName provided.
   *
   * @param {string} url
   * @abstract
   */
  hasChild: function(url) {
    return this.map.aliasFor(url) !== null;
  },

  /**
   * Should iterate snapshot children in priority order. Note that
   * for the RecordSet, this would be the order of the master ref
   * (i.e. the first snapshot) and for a Record, this
   * is simply the order of the keymap.
   *
   * @param {array} snaps
   * @param {function} iterator
   * @param {object} [context]
   * @abstract
   */
  forEach: abstract('forEach'),

  /**
   * When .child() is called on a Snapshot, this will reconcile
   * the correct refs and data for each child and return an array
   * containing the child snapshots for the specified key. For
   * a RecordSet, this should return children for all the fields
   * in the field map. For a Record, this should return a child
   * from the correct snapshot, or the first if the child is not
   * in the map.
   *
   * @param {array} snaps
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
   * @param {array} snaps
   * @param {boolean} isExport
   * @abstract
   */
  mergeData: abstract('mergeData'),

  watch: function(event, callback, cancel, context) {
    this.obs.observe(event, callback, cancel, context);
  },

  unwatch: function(event, callback, context) {
    this.obs.stopObserving(event, callback, context);
  },

  getFieldMap: function() {
    return this.map;
  },

  getPathMgr: function() {
    return this.pathMgr;
  },

  _trigger: function() {
    this.obs.triggerEvent.apply(this.obs, arguments);
  },

  _handler: function(event) {
    return this.eventHandlers[event];
  },

  _cancel: function(error) {
    util.error(error);
    this.obs.abortObservers('error');
  }
};

function abstract(method) {
  return function() {
    throw new Error('Classes implementing AbstractRecord must declare ' + method);
  };
}

module.exports = AbstractRecord;