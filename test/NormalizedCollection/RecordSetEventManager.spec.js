//'use strict';
//
//var RecordSetEventManager = require('../../src/NormalizedCollection/libs/RecordSetEventManager');
//var hp = require('./helpers');
//
//ddescribe('RecordSetEventManager', function() {
//  describe('start', function() {
//    it('should return the instance', function() {
//      var rec = stubRec();
//      var em = new RecordSetEventManager(rec);
//      expect(em.start()).toBe(em);
//    });
//
//    it('should invoke on for master ref', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec);
//      em.start();
//      expect(ref.on).toHaveBeenCalledWith('child_added',
//        jasmine.any(Function), jasmine.any(Object));
//      expect(ref.on).toHaveBeenCalledWith('child_removed',
//        jasmine.any(Function), jasmine.any(Object));
//      expect(ref.on).toHaveBeenCalledWith('child_moved',
//        jasmine.any(Function), jasmine.any(Object));
//    });
//
//    it('should not invoke on if start() called multiple times', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec);
//      em.start();
//      var oldCount = ref.on.calls.count();
//      expect(oldCount).toBeGreaterThan(0);
//      em.start();
//      expect(ref.on.calls.count()).toBe(oldCount);
//    });
//
//    it('should re-trigger events after a stop()', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec);
//      em.start();
//      var oldCount = ref.on.calls.count();
//      expect(oldCount).toBeGreaterThan(0);
//      em.stop();
//      em.start();
//      expect(ref.on.calls.count()).toBeGreaterThan(oldCount);
//    });
//  });
//
//  describe('stop', function() {
//    it('should return the instance', function() {
//      var rec = stubRec();
//      var em = new RecordSetEventManager(rec);
//      expect(em.stop()).toBe(em);
//    });
//
//    it('should invoke off on any triggered events', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec);
//      em.start();
//      em.stop();
//      expect(ref.off).toHaveBeenCalledWith('child_added',
//        jasmine.any(Function), jasmine.any(Object));
//      expect(ref.off).toHaveBeenCalledWith('child_removed',
//        jasmine.any(Function), jasmine.any(Object));
//      expect(ref.off).toHaveBeenCalledWith('child_moved',
//        jasmine.any(Function), jasmine.any(Object));
//    });
//
//    it('should not invoke off if start() never called', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec);
//      em.stop();
//      expect(ref.off.calls.count()).toBe(0);
//    });
//  });
//
//  describe('child_added event', function() {
//    it('should watch record for value events', function() {
//      var rec = stubRec();
//      var ref = rec.getPathManager().first().ref();
//      var em = new RecordSetEventManager(rec).start();
//      ref.push({foo: 'bar'});
//      ref.flush();
//    });
//
//    it('should send a child_added event after the record\'s value event fires');
//
//    it('should send a value event if initial load is completed'); //todo-test
//
//    it('should not trigger a value event if initial load is not completed'); //todo-test
//  });
//
//  describe('child_removed event', function() {
//    it('should unwatch record for value events'); //todo-test
//
//    it('should send a child_removed event'); //todo-test
//
//    it('should send a value event if initial load is completed'); //todo-test
//
//    it('should not trigger a value event if initial load is not completed'); //todo-test
//  });
//
//  describe('child_moved event', function() {
//    it('should watch record for value events'); //todo-test
//
//    it('should send a child_added event after the record\'s value event fires');
//
//    it('should send a value event if initial load is completed'); //todo-test
//
//    it('should not trigger a value event if initial load is not completed'); //todo-test
//  });
//
//  describe('value event on record', function() {
//    it('should trigger child_changed event'); //todo-test
//
//    it('should trigger value event if initial load is completed'); //todo-test
//
//    it('should not trigger value event if initial load is not completed'); //todo-test
//  });
//
//  function stubRec() {
//    var obj = jasmine.createSpyObj('Record', ['watch', 'unwatch', '_trigger', 'getPathManager', 'child']);
//    var mgr = hp.stubPathMgr();
//    obj.$children = {};
//    obj.getPathManager.and.returnValue(mgr);
//    obj.watch.and.callFake(function(event, callback, context) {
//      obj.$callback = callback;
//      obj.$context = context;
//    });
//    obj.child.and.callFake(function(key) {
//      if( !_.has(obj.$children, key) ) {
//        obj.$children[key] = stubRec();
//      }
//      return obj.$children[key];
//    });
//    return obj;
//  }
//
//});
