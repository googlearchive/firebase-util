'use strict';

var _ = require('lodash');
var NormalizedSnapshot = require('../../src/NormalizedCollection/libs/NormalizedSnapshot.js');
var hp = require('./helpers');

describe('NormalizedSnapshot', function() {
  describe('#val', function() {
    it('should call the mergeData method on the record and return that value', function() {
      var snapList = hp.snaps(true);
      var ref = hp.stubNormRef();
      var expVal = {foo: 'bar'};
      var snap = new NormalizedSnapshot(ref, snapList);
      ref.$getRecord().mergeData.and.callFake(function() { return expVal; });
      expect(snap.val()).toBe(expVal);
      expect(ref.$getRecord().mergeData).toHaveBeenCalled();
    });
  });

  describe('#child', function() {
    it('should return a NormalizedSnapshot', function() {
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps(null)).child('foo');
      expect(snap).toBeInstanceOf(NormalizedSnapshot);
    });

    it('should have a ref for the correct child', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(0)).child('bar');
      expect(snap.ref().toString()).toBe(ref.child('bar').toString());
    });

    it('should work for paths with / (nested children)', function() {
      var ref = hp.stubNormRef(['p1']);
      var cref = hp.stubNormRef(['p1']);
      ref.child.and.callFake(function(key){
        cref.key.and.callFake(function() {
          return key;
        });
        return cref;
      });
      var snap = new NormalizedSnapshot(ref, hp.snaps(true));
      var childSnap = snap.child('foo/bar');
      expect(childSnap.key()).toBe('bar');
    });

    it('should be null if child does not exist in data', function() {
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({ foo: {bar: 'baz'} })).child('baz');
      expect(snap.key()).toBe('baz');
      expect(snap.val()).toBe(null);
    });
  });

  describe('#forEach', function() {
    it('should iterate each key in rec.forEachKey', function() {
      var expKeys = ['a', 'b', 'c', 'e'];
      var ref = hp.stubNormRef();
      ref.$getRecord().forEachKey.and.callFake(function(snaps, callback, context) {
        for (var i = 0, len = expKeys.length; i < len; i++) {
          callback.call(context, expKeys[i], expKeys[i]);
        }
      });
      var snap = new NormalizedSnapshot(ref, hp.snaps(true));
      var keys = [];
      snap.forEach(function(ss) {
        keys.push(ss.key());
      });
      expect(keys).toEqual(expKeys);
    });

    it('should only include aliases in the snapshot', function() {
      var expKeys = ['f10', 'bar'];
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref,
        hp.snaps({f10: 'foo', happy: 'baz'}, {f99: 'boo', joy: true})
      );
      var keys = [];
      snap.forEach(function(ss) {
        keys.push(ss.key());
      });
      expect(keys).toEqual(expKeys);
    });

    it('should abort if true is returned', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return true; });
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({
        f10: true, f11: false
      }));
      snap.forEach(spy);
      expect(spy.calls.count()).toBe(1);
    });

    it('should return true if aborted', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return true; });
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({
        f10: true, f11: false
      }));
      var res = snap.forEach(spy);
      expect(res).toBe(true);
    });

    it('should return false if not aborted', function() {
      var spy = jasmine.createSpy().and.callFake(function() { return null; });
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({
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
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({f10: true}));
      snap.forEach(spy, ctx);
      expect(spy).toHaveBeenCalled();
    });

    it('should iterate nested aliases exactly once'); //todo-test

    it('should iterate dynamic fields that have data'); //todo-test
  });

  describe('#hasChild', function() {
    it('should invoke rec.hasChild', function() {
      var ref = hp.stubNormRef();
      var snaps = hp.snaps({f11: true});
      var snap = new NormalizedSnapshot(ref, snaps);
      ref.$getRecord().hasChild.calls.reset();
      snap.hasChild('foo');
      expect(ref.$getRecord().hasChild).toHaveBeenCalledWith(snaps, 'foo');
    });

    it('should return true if rec.hasChild returns true', function() {
      var ref = hp.stubNormRef();
      var snaps = hp.snaps({f11: true});
      var snap = new NormalizedSnapshot(ref, snaps);
      ref.$getRecord().hasChild.and.callFake(function(snaps, key) {
        return key === 'foo';
      });
      expect(snap.hasChild('foo')).toBe(true);
    });

    it('should return false if rec.hasChild returns false', function() {
      var ref = hp.stubNormRef();
      var snaps = hp.snaps({f11: true});
      var snap = new NormalizedSnapshot(ref, snaps);
      ref.$getRecord().hasChild.and.returnValue(false);
      expect(snap.hasChild('foo')).toBe(false);
    });

    // current stubbed record's .child() method doesn't work well in this
    // context (does not do nesting); need to replace that before we can make
    // this work as expected
    it('should work for keys with / in path (nested children)');
  });

  describe('#hasChildren', function() {
    it('should return true if data is an object with at least one key', function() {
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({f10: true}));
      expect(snap.hasChildren()).toBe(true);
    });

    it('should return false if data is not an object', function() {
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps(2));
      expect(snap.hasChildren()).toBe(false);
    });

    it('should return false for an object that does not have fields in map', function() {
      var snap = new NormalizedSnapshot(hp.stubNormRef(), hp.snaps({notinmap: true}));
      expect(snap.hasChildren()).toBe(false);
    });
  });

  describe('#key', function() {
    it('should equal ref\'s key', function() {
      var ref = hp.stubNormRef(['p1']);
      var snap = new NormalizedSnapshot(ref, hp.snaps(null));
      expect(snap.key()).toBe(snap.key());
    });
  });

  describe('#numChildren', function() {
    it('should return the count of children in both map and data', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps({f10: 3, notakey: 4, notakey2: 5}, {f20: 44, notakey3: true}, {key: 4}));
      expect(snap.numChildren()).toBe(2);
    });

    it('should return 0 if data is null', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(null, null));
      expect(snap.numChildren()).toBe(0);
    });

    it('should return 0 if data is primitive', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(true, 99));
      expect(snap.numChildren()).toBe(0);
    });

    it('should not include $value or $key', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(true, 1, 2, 3));
      expect(snap.numChildren()).toBe(0);
    });
  });

  describe('#ref', function() {
    it('should return the original ref', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(true));
      expect(snap.ref()).toBe(ref);
    });

    it('should return correct child after .child() is used', function() {
      var ref = hp.stubNormRef();
      var snap = new NormalizedSnapshot(ref, hp.snaps(true)).child('foo');
      expect(snap.ref().toString()).toBe(ref.child('foo').toString());
    });
  });

  describe('#getPriority', function() {
    it('should call record.getPriority with array of snaps', function() {
      var snaps = hp.snaps(true, false);
      var ref = hp.stubNormRef();
      var spy = ref.$getRecord().getPriority;
      spy.and.returnValue(-9999.9999);
      var snap = new NormalizedSnapshot(ref, snaps);
      var res = snap.getPriority();
      expect(spy).toHaveBeenCalledWith(snaps);
      expect(res).toBe(-9999.9999);
    });
  });

  describe('#exportVal', function() {
    it('should include the correct value'); //todo-test

    it('should include .value for primitives'); //todo-test

    it('should include .priority if it is not null'); //todo-test

    it('should not include .priority if it is null'); //todo-test

    it('should be null if no value'); //todo-test

    it('should include nested children'); //todo-test

    it('should be a copy of the data with no original pointers'); //todo-test

    it('should return a primitive if exactly one path'); //todo-test

    it('should merge values from multiple paths'); //todo-test

    it('should use value from first path over others if there is a conflict'); //todo-test

    it('should merge child records if this is the master'); //todo-test

    it('should not merge deep children if this is the master'); //todo-test
  });
});
