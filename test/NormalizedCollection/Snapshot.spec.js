//'use strict';
//
//var Snapshot = require('../../src/NormalizedCollection/libs/Snapshot.js');
//
//describe('Snapshot', function() {
//  describe('#val', function() {
//    it('should return the correct value', function() {
//      var snap = new Snapshot(stubRef(), null, snaps({foo: 'bar'}));
//      expect(snap.val()).toEqual({foo: 'bar'});
//    });
//
//    it('should return null if no value', function() {
//      var snap = new Snapshot(stubRef());
//      expect(snap.val()).toBe(null);
//    });
//
//    it('should be a copy of the data with no original pointers', function() {
//      var data = {foo: {bar: 'baz'}};
//      var snap = new Snapshot(stubRef(), null, snaps(data));
//      expect(snap.val()).toEqual(data);
//      expect(snap.val()).not.toBe(data);
//      expect(snap.val().foo).toEqual(data['foo']);
//      expect(snap.val().foo).not.toBe(data['foo']);
//    });
//
//    it('should return null for an empty object', function() {
//      var snap = new Snapshot(stubRef(), null, snaps({}));
//      expect(snap.val()).toBe(null);
//    });
//
//    it('should return a primitive if exactly one path');
//
//    it('should merge values from multiple paths');
//
//    it('should use value from first path over others if there is a conflict');
//
//    it('should merge child records if this is the master');
//
//    it('should not merge deep children if this is the master');
//  });
//
//  describe('#child', function() {
//    it('should return a Snapshot', function() {
//      var snap = new Snapshot(stubRef()).child('foo');
//      expect(snap).toBeInstanceOf(Snapshot);
//    });
//
//    it('should have a ref for the correct child', function() {
//      var snap = new Snapshot(stubRef('foo')).child('bar');
//      expect(snap.ref().name()).toBe('bar');
//    });
//
//    it('should have the child data', function() {
//      var snap = new Snapshot(stubRef(), null, snaps({ foo: {bar: 'baz'} }));
//      var data = snap.val();
//      var child = snap.child('foo');
//      expect(child.val()).toEqual(data['foo']);
//      expect(child.val()).not.toBe(data['foo']);
//    });
//
//    it('should be null if child does not exist in data', function() {
//      var snap = new Snapshot(stubRef(), null, snaps({ foo: {bar: 'baz'} })).child('baz');
//      expect(snap.val()).toBe(null);
//    });
//
//    it('should work for paths with / (nested children)', function() {
//      var data = {foo: {bar: {baz: 'foobar'}}};
//      var snap = new Snapshot(stubRef(), null, snaps(data)).child('foo/bar/baz');
//      expect(snap.val()).toBe('foobar');
//    });
//
//    it('should return one child if this is not the master collection');
//
//    it('should return all children if this is the master collection');
//  });
//
//  describe('#forEach', function() {
//    it('should iterate each key by priority', function() {
//
//    });
//
//    it('should return child snapshot');
//
//    it('should not iterate a primitive');
//
//    it('should abort if true is returned');
//
//    it('should return true if aborted');
//
//    it('should return false if not aborted');
//  });
//
//  describe('#hasChild', function() {
//    it('should return true if child exists');
//
//    it('should return false if child does not exist');
//
//    it('should return false if value is a primitive');
//  });
//
//  describe('#hasChildren', function() {
//    it('should return true if data is an object with at least one key');
//
//    it('should return false if data is not an object');
//
//    it('should return false for an empty object');
//  });
//
//  describe('#name', function() {
//    it('should return the ref name');
//  });
//
//  describe('#numChildren', function() {
//    it('should return the count of children');
//
//    it('should return 0 if data is null');
//
//    it('should return 0 if data is primitive');
//  });
//
//  describe('#ref', function() {
//    it('should return the original ref');
//
//    it('should return correct child after .child() is used');
//  });
//
//  describe('#getPriority', function() {
//    it('should return the correct priority');
//
//    it('should return null if no priority');
//  });
//
//  describe('#exportVal', function() {
//    it('should include the correct value');
//
//    it('should include .value for primitives');
//
//    it('should include .priority if it is not null');
//
//    it('should not include .priority if it is null');
//
//    it('should be null if no value');
//
//    it('should include nested children');
//
//    it('should be a copy of the data with no original pointers');
//
//    it('should return a primitive if exactly one path');
//
//    it('should merge values from multiple paths');
//
//    it('should use value from first path over others if there is a conflict');
//
//    it('should merge child records if this is the master');
//
//    it('should not merge deep children if this is the master');
//  });
//
//  function snaps() {
//    //todo-test
//  }
//
//  function stubSnap() {
//    //todo-test
//  }
//
//  function stubRef(pathName) {
//    if( arguments.length === 0 ) { pathName = null; } // root
//    var obj = jasmine.createSpyObj('ref', ['name', 'child', 'ref']);
//    obj.child.and.callFake(function(key) { return stubRef(key); });
//    obj.ref.and.callFake(function() { return obj; });
//    obj.name.and.callFake(function() { return pathName; });
//    return obj;
//  }
//});
