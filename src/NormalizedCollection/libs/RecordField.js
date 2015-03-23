'use strict';

var PathManager        = require('./PathManager');
var FieldMap           = require('./FieldMap');
var AbstractRecord     = require('./AbstractRecord');
var util               = require('../../common');

function RecordField(fieldMap) {
  this.path = fieldMap.getPathManager().first();
  this._super(fieldMap, this.path.name(), this.path.url());
  if( fieldMap.getPathManager().count() !== 1 ) {
    throw new Error('RecordField must have exactly one path, but we got '+ fieldMap.getPathManager().count());
  }
  if( fieldMap.length !== 1 ) {
    throw new Error('RecordField must have exactly one field, but we found '+ fieldMap.length);
  }
  util.log.debug('RecordField created', this.getName(), this.getUrl());
}

util.inherits(RecordField, AbstractRecord, {
  makeChild: function(key) {
    var pm = new PathManager([this.path.child(key)]);
    var fm = new FieldMap(pm);
    fm.add({key: FieldMap.key(pm.first(), '$value'), alias: key});
    return new RecordField(fm);
  },

  hasChild: function(snaps, key) {
    return snaps[0].hasChild(key);
  },

  getChildSnaps: function(snaps, fieldName) {
    // there is exactly one snap and there are no aliases to deal with
    return [snaps[0].child(fieldName)];
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
    return isExport? snaps[0].exportVal() : snaps[0].val();
  },

  getPriority: function(snaps) {
    return snaps[0].getPriority();
  },

  /**
   * Iterates all keys of snapshot.
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
    var firstSnap = snaps[0];
    return firstSnap.forEach(function(ss) {
      iterator.call(context, ss.key(), ss.key());
    });
  },

  saveData: function(data, opts) {
    var ref = this.path.ref();
    if( opts.isUpdate ) {
      if( !util.isObject(data) ) {
        throw new Error('When using update(), the data must be an object.');
      }
      if( util.has(opts, 'priority') ) {
        data['.priority'] = opts.priority;
      }
      ref.update(data, wrapCallback(opts));
    }
    else if( util.has(opts, 'priority') ) {
      ref.setWithPriority(data, opts.priority, wrapCallback(opts));
    }
    else {
      ref.set(data, wrapCallback(opts));
    }
  },

  getClass: function() { return RecordField; },

  _start: function(event) {
    this.path.ref().on(event, this.handler(event), this._cancel, this);
  },

  _stop:   function(event) {
    this.path.ref().off(event, this.handler(event), this);
  }
});

function wrapCallback(opts) {
  if( opts.callback ) {
    return function() {
      opts.callback.apply(opts.context, arguments);
    };
  }
  else {
    return util.noop;
  }
}

module.exports = RecordField;