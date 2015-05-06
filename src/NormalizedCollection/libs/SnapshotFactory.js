
'use strict';

var util = require('../../common');
var NormalizedSnapshot = require('./NormalizedSnapshot.js');

function SnapshotFactory(event, key, snaps, prevChild) {
  this.event = event;
  this.key = key;
  this.snaps = unwrapSnapshots(snaps);
  this.prevChild = prevChild;
  assertValidTrigger(this);
}

SnapshotFactory.prototype.create = function(ref) {
  var snapshot;
  if( this.event === 'value' ) {
    snapshot = new NormalizedSnapshot(ref, this.snaps);
  }
  else {
    snapshot = new NormalizedSnapshot(ref.ref().child(this.key), this.snaps);
  }
  return snapshot;
};

SnapshotFactory.prototype.toString = function() {
  return util.printf(
    'SnapshotFactory(event=%s, key=%s, numberOfSnapshots=%s, prevChild=%s',
    this.event, this.key, this.snaps.length, this.prevChild === util.undef? 'undefined' : this.prevChild
  );
};

function assertValidTrigger(trigger) {
  switch(trigger.event) {
    case 'value':
      break;
    case 'child_added':
    case 'child_moved':
      if( typeof trigger.key !== 'string' || !trigger.key ) {
        throw new Error('Invalid trigger key ' + trigger.key);
      }
      if( trigger.prevChild === util.undef ) {
        throw new Error('Triggers must provide a valid prevChild value for child_added and child_moved events');
      }
      break;
    case 'child_removed':
    case 'child_changed':
      if( typeof trigger.key !== 'string' || !trigger.key ) {
        throw new Error('Invalid trigger key ' + trigger.key);
      }
      break;
    default:
      throw new Error('Invalid trigger event type: ' + trigger.event);
  }
}

function unwrapSnapshots(snaps) {
  if( snaps instanceof NormalizedSnapshot ) {
    return snaps._snaps.slice();
  }
  if( !util.isArray(snaps) ) {
    return [snaps];
  }
  return snaps.slice();
}

module.exports = SnapshotFactory;