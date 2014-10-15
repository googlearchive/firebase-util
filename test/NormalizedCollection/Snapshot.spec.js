'use strict';

var _ = require('lodash');
var Snapshot = require('../../src/NormalizedCollection/libs/Snapshot.js');

describe('Snapshot', function() {
  var hp;
  beforeEach(function() {
    hp = this.helpers;
  });

  describe('#val', function() {
    it('should call the mergeData method on the record and return than value', function() {
      var snapList = snaps(true);
      var ref = hp.stubRef();
      var expVal = {foo: 'bar'};
      var snap = new Snapshot(ref, snapList);
      ref._getRec().mergeData.and.callFake(function() { return expVal; });
      expect(snap.val()).toBe(expVal);
      expect(ref._getRec().mergeData).toHaveBeenCalled();
    });
  });

  describe('#child', function() {
    it('should return a Snapshot', function() {
      var snap = new Snapshot(hp.stubRef(), snaps(null)).child('foo');
      expect(snap).toBeInstanceOf(Snapshot);
    });

    it('should have a ref for the correct child', function() {
      var ref = hp.stubRef('foo');
      var snap = new Snapshot(ref, snaps(0)).child('bar');
      expect(snap.ref().toString()).toBe(ref.child('bar').toString());
    });

    it('should work for paths with / (nested children)', function() {
      var ref = hp.stubRef();
      ref._getRec().mergeData.and.callFake(function() { return {foo: 'bar'}; });
      var snap = new Snapshot(ref, snaps({ foo: {bar: 'baz'} }));
      var data = snap.child('foo/bar').val();
      expect(data).toEqual('baz');
    });

    it('should be null if child does not exist in data', function() {
      var snap = new Snapshot(hp.stubRef(), snaps({ foo: {bar: 'baz'} })).child('baz');
      expect(snap.name()).toBe('baz');
      expect(snap.val()).toBe(null);
    });
  });

  describe('#forEach', function() {
    it('should iterate each key that is in the rec', function() {
      var expKeys = ['field1', 'field3'];
      var rec = hp.stubRec(expKeys);
      var ref = hp.stubRef('path1', rec);
      var snap = new Snapshot(ref, snaps({field1: 'foo', field2: 'bar', field3: 'baz'}, {field4: 'boo'}));
      var keys = [];
      snap.forEach(function(ss) {
        keys.push(ss.name());
      });
      expect(keys).toEqual(expKeys);
    });

    it('should only include fields in the snapshot', function() {
      var expKeys = ['field1', 'field3'];
      var rec = hp.stubRec(['field1', 'field2', 'field3']);
      var ref = hp.stubRef('path1', rec);
      var snap = new Snapshot(ref, snaps({field1: 'foo', field3: 'baz'}, {field4: 'boo'}));
      var keys = [];
      snap.forEach(function(ss) {
        keys.push(ss.name());
      });
      expect(keys).toEqual(expKeys);
    });

    it('should return correct value for each key', function() {
      var data = {field1: 'foo', field2: 'bar', field3: 'baz'};
      var spy = jasmine.createSpy().and.callFake(function(ss) {
        expect(data).toHaveKey(ss.name());
        expect(ss.val()).toEqual(data[ss.name()]);
      });
      var expKeys = ['field1', 'field3'];
      var rec = hp.stubRec(expKeys);
      var ref = hp.stubRef('path1', rec);
      var snap = new Snapshot(ref, snaps(data, {field4: 'boo'}));
      snap.forEach(spy);
      expect(spy.calls.count()).toBe(expKeys.length);
    });

    it('should not iterate a primitive', function() {
      var spy = jasmine.createSpy();
      var snap = new Snapshot(hp.stubRef(), snaps(true));
      snap.forEach(spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should abort if true is returned', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return true; });
      var rec = hp.stubRec(['field1', 'field2', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps({
        field1: true, field2: false, field3: {bar: 'baz'}
      }));
      snap.forEach(spy);
      expect(spy.calls.count()).toBe(1);
    });

    it('should return true if aborted', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return true; });
      var rec = hp.stubRec(['field1', 'field2', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps({
        field1: true, field2: false, field3: {bar: 'baz'}
      }));
      var res = snap.forEach(spy);
      expect(res).toBe(true);
    });

    it('should return false if not aborted', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return null; });
      var rec = hp.stubRec(['field1', 'field2', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps({
        field1: true, field2: false, field3: {bar: 'baz'}
      }));
      var res = snap.forEach(spy);
      expect(res).toBe(false);
    });

    it('should evaluate in correct context', function() {
      var ctx = {};
      var spy = jasmine.createSpy().and.callFake(function() {
        expect(this).toBe(ctx);
      });
      var snap = new Snapshot(hp.stubRef(), snaps({field1: true}));
      snap.forEach(spy, ctx);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#hasChild', function() {
    it('should return true if child exists in both snapshots and field list', function() {
      var rec = hp.stubRec(['field1', 'field3']);
      var snap = new Snapshot(hp.stubRef('path1', rec), snaps({field3: true}));
      expect(snap.hasChild('field3')).toBe(true);
    });

    it('should return false if child does not exist in field list', function() {
      var rec = hp.stubRec(['field1', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps({field2: true}));
      expect(snap.hasChild('field2')).toBe(false);
    });

    it('should return false if child does not exist in snapshot data', function() {
      var rec = hp.stubRec(['field1', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps({field3: true}));
      expect(snap.hasChild('field1')).toBe(false);
    });

    it('should return false if value is a primitive', function() {
      var rec = hp.stubRec(['field1', 'field3']);
      var snap = new Snapshot(hp.stubRef('p1', rec), snaps(9));
      expect(snap.hasChild('field3')).toBe(false);
    });
  });

  describe('#hasChildren', function() {
    it('should return true if data is an object with at least one key', function() {
      var rec = hp.stubRec(['field1']);
      var snap = new Snapshot(hp.stubRef(rec), snaps({field1: true}));
      expect(snap.hasChildren()).toBe(true);
    });

    it('should return false if data is not an object', function() {
      var rec = hp.stubRec(['field1']);
      var snap = new Snapshot(hp.stubRef('path1', rec), snaps(2));
      expect(snap.hasChildren()).toBe(false);
    });

    it('should return false for an object that does not have fields in map', function() {
      var rec = hp.stubRec(['field1']);
      var snap = new Snapshot(hp.stubRef('path1', rec), snaps({notinmap: true}));
      expect(snap.hasChildren()).toBe(false);
    });
  });

  describe('#name', function() {
    it('should return the ref name', function() {
      var ref = hp.stubRef('foopath');
      var snap = new Snapshot(ref, snaps(null));
      expect(snap.name()).toBe('foopath');
    });

    it('should return null for the root path', function() {
      var ref = hp.stubRef();
      var snap = new Snapshot(ref, snaps(null));
      expect(snap.name()).toBe(null);
    });
  });

  describe('#numChildren', function() {
    it('should return the count of children in both map and data', function() {
      var rec = hp.stubRec(['path1.field1', 'path1.field2', 'path1.field3', 'path2.field4']);
      var ref = hp.stubRef('[path1][path2]', rec);
      var snap = new Snapshot(ref, snaps({field3: 3, field4: 4, field5: 5}, {field3: 33, field4: 44}));
      expect(snap.numChildren()).toBe(2);
    });

    it('should return 0 if data is null', function() {
      var rec = hp.stubRec(['path1.field1', 'path1.field2', 'path1.field3', 'path2.field4']);
      var ref = hp.stubRef('[path1][path2]', rec);
      var snap = new Snapshot(ref, snaps(null, null));
      expect(snap.numChildren()).toBe(0);
    });

    it('should return 0 if data is primitive', function() {
      var rec = hp.stubRec(['path1.field1', 'path1.field2', 'path1.field3', 'path2.field4']);
      var ref = hp.stubRef('[path1][path2]', rec);
      var snap = new Snapshot(ref, snaps(true, 99));
      expect(snap.numChildren()).toBe(0);
    });
  });

  describe('#ref', function() {
    it('should return the original ref', function() {
      var ref = hp.stubRef('p1', hp.stubRec());
      var snap = new Snapshot(ref, snaps(true));
      expect(snap.ref()).toBe(ref);
    });

    it('should return correct child after .child() is used', function() {
      var ref = hp.stubRef('p1', hp.stubRec());
      var snap = new Snapshot(ref, snaps(true)).child('foo');
      expect(snap.ref().toString()).toBe(ref.child('foo').toString());
    });
  });

  describe('#getPriority', function() {
    it('should return priority from first snapshot', function() {
      var snap = new Snapshot(hp.stubRef(), snaps(true, false));
      expect(snap.getPriority()).toBe(1);
    });
  });

  describe('#exportVal', function() {
    it('should include the correct value');

    it('should include .value for primitives');

    it('should include .priority if it is not null');

    it('should not include .priority if it is null');

    it('should be null if no value');

    it('should include nested children');

    it('should be a copy of the data with no original pointers');

    it('should return a primitive if exactly one path');

    it('should merge values from multiple paths');

    it('should use value from first path over others if there is a conflict');

    it('should merge child records if this is the master');

    it('should not merge deep children if this is the master');
  });

  function snaps() {
    var i = 0;
    return _.map(arguments, function(snapData) {
      i++;
      return hp.stubSnap(
        hp.stubRef('path' + i),
        snapData,
        i
      );
    });
  }
});
