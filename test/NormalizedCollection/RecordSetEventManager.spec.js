'use strict';

var RecordSetEventManager = require('../../src/NormalizedCollection/libs/RecordSetEventManager');
var hp = require('./helpers');
var _ = require('lodash');

describe('RecordSetEventManager', function() {
  describe('start', function() {
    it('should return the instance', function() {
      var rec = stubRec();
      var em = new RecordSetEventManager(rec);
      expect(em.start()).toBe(em);
    });

    it('should invoke on for master ref', function() {
      var rec = stubRec();
      var spy = spyOn(rec.getPathManager().first().ref(), 'on');
      var em = new RecordSetEventManager(rec);
      em.start();
      expect(spy).toHaveBeenCalledWith('child_added',
        jasmine.any(Function), jasmine.any(Object));
      expect(spy).toHaveBeenCalledWith('child_removed',
        jasmine.any(Function), jasmine.any(Object));
      expect(spy).toHaveBeenCalledWith('child_moved',
        jasmine.any(Function), jasmine.any(Object));
    });

    it('should not invoke on if start() called multiple times', function() {
      var stub = loadWithStub();
      var spy = spyOn(stub.ref, 'on');
      var oldCount = spy.calls.count();
      expect(oldCount).toBe(0);
      stub.mgr.start();
      stub.mgr.start();
      expect(spy.calls.count()).toBe(0);
    });

    it('should re-trigger events after a stop()', function() {
      var stub = loadWithStub();
      var spy = spyOn(stub.ref, 'on');
      expect(spy.calls.count()).toBe(0);
      stub.mgr.stop();
      stub.mgr.start();
      expect(spy.calls.count()).toBeGreaterThan(0);
    });

    it('should trigger a value event after initial load'); //todo-test
  });

  describe('stop', function() {
    it('should return the instance', function() {
      var rec = stubRec();
      var em = new RecordSetEventManager(rec);
      expect(em.stop()).toBe(em);
    });

    it('should invoke off on any triggered events', function() {
      var stub = loadWithStub({foo: 'bar'});
      var spy = spyOn(stub.ref, 'off');
      stub.mgr.stop();
      expect(spy).toHaveBeenCalledWith('child_added',
        jasmine.any(Function), jasmine.any(Object));
      expect(spy).toHaveBeenCalledWith('child_removed',
        jasmine.any(Function), jasmine.any(Object));
      expect(spy).toHaveBeenCalledWith('child_moved',
        jasmine.any(Function), jasmine.any(Object));
    });

    it('should not invoke off if start() never called', function() {
      var rec = stubRec();
      var spy = spyOn(rec.getPathManager().first().ref(), 'off');
      var em = new RecordSetEventManager(rec);
      em.stop();
      expect(spy.calls.count()).toBe(0);
    });
  });

  describe('child_added event', function() {
    it('should watch record for value events', function() {
      var stub = loadWithStub({foo: 'bar'});
      expect(stub.child.watch)
        .toHaveBeenCalledWith('value',
          jasmine.any(Function), jasmine.any(Object));
    });

    it('should trigger a child_added event after the record\'s value event fires', function() {
      var data = {foo: 'bar'};
      var stub = loadWithStub(data);
      expect(stub.rec._trigger)
        .toHaveBeenCalledWith('child_added', stub.id, jasmine.any(Object), null);
    });
  });

  describe('child_removed event', function() {
    it('should unwatch record for value events', function() {
      var stub = loadWithStub({foo: 'bar'});
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.child.unwatch).toHaveCallCount(1);
    });

    it('should send a child_removed event', function() {
      var stub = loadWithStub({foo: 'bar'});
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.rec._trigger).toHaveBeenCalledWith(
        'child_removed', stub.id
      );
    });

    it('should send a value event if initial load is completed', function() {
      var data = {foo: 'bar'};
      var stub = loadWithStub(data);
      expect(stub.rec._trigger).toHaveBeenCalledWith('value', [jasmine.any(Object)]);
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.rec._trigger).toHaveBeenCalledWith('value', []);
    });

    it('should not trigger a value event if initial load is not completed', function() {
      var data = {foo: {bar: {baz: 'foo'}}};

      var rec = stubRec();
      var ref = rec.getPathManager().first().ref();
      new RecordSetEventManager(rec).start();

      // prevent value event from firing and marking data as loaded
      _.each(ref.getFlushQueue(), function(q) {
        if(q.sourceData.method === 'once') {
          q.cancel();
          var args = q.sourceData;
          var fn = args[1];
          var context = args[3];
          ref.off('value', fn, context);
        }
      });
      ref.flush();

      // add a new record
      var id = ref.push(data).name();
      ref.flush();
      rec.child(id)._trigger('value', id, hp.stubSnap(ref, data));
      expect(rec._trigger).not.toHaveBeenCalledWith('value', [jasmine.any(Object)]);

      // remove the new record
      ref.child(id).remove();
      ref.flush();

      // there should be no event triggered
      expect(rec._trigger).not.toHaveBeenCalledWith('value', []);
    });

    it('should not trigger a child_removed event if child ' +
        ' has not returned a `value` event yet (i.e. record is not loaded)', function() {
      var stub = loadWithStub();
      var ref = stub.ref;
      var id = ref.push(-99).name();
      ref.flush();
      // do not do rec.child(id)._trigger() here, to simulate value not being called yet

      // remove the new record
      ref.child(id).remove();
      ref.flush();

      expect(stub.rec._trigger).not.toHaveBeenCalledWith('child_removed', id);
    });
  });

  describe('child_moved event', function() {
    it('should watch record for value events'); //todo-test

    it('should send a child_added event after the record\'s value event fires');

    it('should send a value event if initial load is completed'); //todo-test

    it('should not trigger a value event if initial load is not completed'); //todo-test
  });

  describe('value event on record', function() {
    it('should trigger child_changed event'); //todo-test

    it('should trigger value event if initial load is completed'); //todo-test

    it('should not trigger value event if initial load is not completed'); //todo-test
  });

  /**
   * Creates a Record stub
   * Starts the RecordSetEventManager
   * Fetches the ref used to create the record
   * If data is provided, loads data and calls flush()
   * Creates a listener on rec.watch('child_added') so it can be spied on easily
   *
   * @param [data]
   * @returns {{rec: *, ref: *, mgr: *, id: *}}
   */
  function loadWithStub(data) {
    var id = null;
    var rec = stubRec();
    var ref = rec.getPathManager().first().ref();
    var mgr = new RecordSetEventManager(rec).start();
    if( data ) {
      id = ref.push(data).name();
      ref.flush();
      rec.child(id)._trigger('value', id, hp.stubSnap(ref, data));
      //var childSpy = rec.child(id).$spies[0];
      //childSpy.fn.call(childSpy.ctx, 'value', id, hp.stubSnap(ref, data));
    }
    return {rec: rec, ref: ref, mgr: mgr, id: id, child: id? rec.child(id) : null};
  }

  function stubRec() {
    var obj = jasmine.createSpyObj('Record', ['watch', 'unwatch', '_trigger', 'getPathManager', 'child']);
    var mgr = hp.stubPathMgr();
    obj.$children = {};
    obj.$spies = [];
    obj.getPathManager.and.returnValue(mgr);
    obj._trigger.and.callFake(function() {
      var args = _.toArray(arguments);
      _.each(obj.$spies, function(spyObj) {
        spyObj.fn.apply(spyObj.ctx, args);
      });
    });
    obj.watch.and.callFake(function(event, callback, context) {
      var fn = jasmine.createSpy('$callback listener ' + obj.$spies.length)
        .and.callFake(function() {
          callback.apply(context, arguments);
        });
      obj.$spies.push({ e: event||null, ctx: context||null, fn: fn });
    });
    obj.child.and.callFake(function(key) {
      if( !_.has(obj.$children, key) ) {
        obj.$children[key] = stubRec();
      }
      return obj.$children[key];
    });
    return obj;
  }

  function noop() {}

});
