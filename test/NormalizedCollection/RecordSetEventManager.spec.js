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
      expect(stub.rec.child(stub.id).watch)
        .toHaveBeenCalledWith('value', jasmine.any(Function));
    });

    it('should trigger a child_added event after the record\'s value event fires', function() {
      var data = {foo: 'bar'};
      var stub = loadWithStub(data);
      expect(stub.rec.$trigger)
        .toHaveBeenCalledWith('child_added', stub.id, jasmine.any(Object), null);
    });

    it('should trigger a value event', function() {
      var data = {foo: 'bar'};
      var stub = loadWithStub(data);
      expect(stub.rec.$trigger).toHaveBeenCalledWith('value', [jasmine.any(Object)]);
    });

    it('should not trigger a value event if load not completed', function() {
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
      var id = ref.push(data).key();
      ref.flush();
      rec.child(id).handler('value')(hp.stubSnap(ref, data));
      expect(rec.$trigger).not.toHaveBeenCalledWith('value', [jasmine.any(Object)]);
    });
  });

  describe('child_removed event', function() {
    it('should unwatch record for value events', function() {
      var stub = loadWithStub({foo: 'bar'});
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.rec.child(stub.id).unwatch).toHaveCallCount(1);
    });

    it('should send a child_removed event', function() {
      var stub = loadWithStub({foo: 'bar'});
      stub.rec.$trigger.calls.reset();
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.rec.$trigger).toHaveBeenCalledWith(
        'child_removed', stub.id, jasmine.any(Object)
      );
    });

    it('should trigger a value event', function() {
      var data = {foo: 'bar'};
      var stub = loadWithStub(data);
      expect(stub.rec.$trigger).toHaveBeenCalledWith('value', [jasmine.any(Object)]);
      stub.ref.child(stub.id).remove();
      stub.ref.flush();
      expect(stub.rec.$trigger).toHaveBeenCalledWith('value', []);
    });

    it('should not trigger a value event if initial load is not completed', function() {
      var data = {foo: {bar: {baz: 'foo'}}};

      var rec = stubRec();
      var ref = rec.getPathManager().first().ref();
      new RecordSetEventManager(rec).start();

      cancelOnce(ref);

      // add a new record
      var id = ref.push(data).key();
      ref.flush();
      rec.child(id).handler('value')(hp.stubSnap(ref, data));
      expect(rec.$trigger).not.toHaveBeenCalledWith('value', [jasmine.any(Object)]);

      // remove the new record
      ref.child(id).remove();
      ref.flush();

      // there should be no event triggered
      expect(rec.$trigger).not.toHaveBeenCalledWith('value', []);
    });

    it('should not trigger a child_removed event if child ' +
        ' has not returned a `value` event yet (i.e. record is not loaded)', function() {
      var stub = loadWithStub();
      var ref = stub.ref;
      var id = ref.push(-99).key();
      ref.flush();
      // do not do rec.child(id).$trigger() here, to simulate value not being called yet

      // remove the new record
      ref.child(id).remove();
      ref.flush();

      expect(stub.rec.$trigger).not.toHaveBeenCalledWith('child_removed', id);
    });
  });

  describe('child_moved event', function() {
    it('should send a child_moved event on parent rec', function() {
      var stub = loadWithStub();
      var ref = stub.ref;
      var a = stub.add({foo: 'bar'});
      var b = stub.add({bar: 'baz'});

      // move the record
      ref.child(a).setPriority(99999);
      ref.flush();

      expect(stub.rec.$trigger).toHaveBeenCalledWith('child_moved', a, jasmine.any(Object), b);
    });

    it('should send a value event if initial load is completed', function() {
      var stub = loadWithStub();
      var ref = stub.ref;
      var a = stub.add(true);
      var b = stub.add(false);
      stub.rec.$trigger.calls.reset();
      ref.child(a).setPriority(99999);
      ref.flush();
      expect(stub.rec.$trigger).toHaveBeenCalledWith('value', jasmine.any(Object));
    });

    it('should not trigger a value event if initial load is not completed', function() {
      var data = 99;
      var rec = stubRec();
      var ref = rec.getPathManager().first().ref();
      new RecordSetEventManager(rec).start();

      cancelOnce(ref);

      // add a new record
      var a = ref.push(data).key();
      ref.flush();
      rec.child(a).handler('value')(hp.stubSnap(ref, data));

      var b = ref.push(data).key();
      ref.flush();
      rec.child(b).handler('value')(hp.stubSnap(ref, data));

      rec.$trigger.calls.reset();

      // move record a
      ref.child(a).setPriority(999999);
      ref.flush();

      // there should be no event triggered
      expect(rec.$trigger).not.toHaveBeenCalledWith('value', jasmine.any(Object));
    });

    it('should not trigger a child_moved event if child ' +
    ' has not returned a `value` event yet (i.e. record is not loaded)', function() {
      var stub = loadWithStub();
      var ref = stub.ref;
      var a = stub.add(true);
      var b = stub.add(false);

      stub.rec.$trigger.calls.reset();
      ref.child(a).setPriority(99999);
      ref.flush();

      expect(stub.rec.$trigger).not.toHaveBeenCalledWith('child_moved', stub.id, jasmine.any(Object), b);
    });
  });

  describe('value event on record', function() {
    it('should trigger child_changed event', function() {
      var stub = loadWithStub({foo: 'bar'});
      var rec = stub.rec;
      rec.$trigger.calls.reset();
      var cb = rec.child(stub.id).$spies[0];
      cb.fn.call(cb.ctx, hp.stubSnap(hp.mockRef(stub.id), {foo: 'baz'}));
      expect(rec.$trigger).toHaveBeenCalledWith('child_changed', stub.id, jasmine.any(Object));
    });

    it('should trigger value event if initial load is completed', function() {
      var stub = loadWithStub({foo: 'bar'});
      var rec = stub.rec;
      rec.$trigger.calls.reset();
      var cb = rec.child(stub.id).$spies[0];
      cb.fn.call(cb.ctx, hp.stubSnap(hp.mockRef(stub.id), {foo: 'baz'}));
      expect(rec.$trigger).toHaveBeenCalledWith('value', jasmine.any(Object));
    });

    it('should not trigger value event if initial load is not completed', function() {
      var rec = stubRec();
      var ref = rec.getPathManager().first().ref();
      new RecordSetEventManager(rec).start();

      cancelOnce(ref);

      // add a new record
      var id = ref.push(99).key();
      ref.flush();
      rec.child(id).handler('value')(hp.stubSnap(ref,  99));
      rec.child(id).handler('value')(hp.stubSnap(ref, 100));

      // there should be no event triggered
      expect(rec.$trigger).not.toHaveBeenCalledWith('value', jasmine.any(Object));
    });
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

    function addFn(data) {
      var id = ref.push(data).key();
      ref.flush();
      var cb = rec.child(id).$spies[0];
      cb.fn.call(cb.ctx, hp.stubSnap(ref.child(id), data));
      return id;
    }

    if( data ) {
      id = addFn(data);
    }
    return {rec: rec, ref: ref, mgr: mgr, id: id, add: addFn};
  }

  function stubRec() {
    return hp.stubRec();
  }

  function cancelOnce(ref) {
    // prevent once() event from firing and marking data as loaded
    _.each(ref.getFlushQueue(), function(q) {
      var args = q.sourceData;
      if(args.method === 'once') {
        q.cancel();
        var fn = args[1];
        var context = args[3];
        ref.off('value', fn, context);
      }
    });
    ref.flush();
  }

});
