
'use strict';

var AbstractRecord = require('../../src/NormalizedCollection/libs/AbstractRecord');
var util = require('../../src/common');
var hp = require('./helpers');

describe('AbstractRecord', function() {
  var Rec;
  beforeEach(function() {
    Rec = function() {
      this._super(hp.stubFieldMap());
      this.setRef(hp.stubNormRef());
    };
    util.inherits(Rec, AbstractRecord, {
      _start: jasmine.createSpy('_start'),
      _stop: jasmine.createSpy('_stop')
    });
  });

  describe('#getFieldMap', function() {
    it('should return the FieldMap', function() {
      var map = {};
      var rec = new AbstractRecord(map);
      expect(rec.getFieldMap()).toBe(map);
    });
  });

  describe('#getPathManager', function() {
    it('should return the PathManager', function() {
      var pm = {};
      var map = { getPathManager: function() { return pm; }};
      var rec = new AbstractRecord(map);
      expect(rec.getPathManager()).toBe(pm);
    });
  });

  describe('#watch', function() {
    it('should trigger _start() on the first watch call', function() {
      var rec = new Rec();
      rec.watch('value', util.noop);
      expect(rec._start).toHaveBeenCalledWith('value', 1);
    });

    it('should trigger _start() if all events removed first', function() {
      var rec = new Rec();
      rec.watch('value', util.noop);
      expect(rec._start).toHaveBeenCalledWith('value', 1);
      rec.watch('child_added', util.noop);
      rec.unwatch('value', util.noop);
      rec.watch('value', util.noop);
      expect(rec._start.calls.count()).toBe(3);
      expect(rec._start).toHaveBeenCalledWith('value', 2);
    });

    it('should trigger _start() if a new event is registered', function() {
      var rec = new Rec();
      rec.watch('value', util.noop);
      expect(rec._start).toHaveBeenCalledWith('value', 1);
      rec.watch('child_added', util.noop);
      expect(rec._start).toHaveBeenCalledWith('child_added', 2);
    });

    it('should throw an error if an invalid event is passed', function() {
      var rec = new Rec();
      expect(function() {
        rec.watch('notvalid', util.noop);
      }).toThrowError(Error);
    });

    it('should throw an error if no callback function is provided', function() {
      var rec = new Rec();
      expect(function() {
        rec.watch('value', null);
      }).toThrowError(Error);
    });

    it('should invoke the callback when event is triggered', function() {
      var rec = new Rec();
      var spy = jasmine.createSpy('watch callback').and.callFake(function(snap) {
        expect(snap.val()).toBe(99);
      });
      rec.watch('value', spy);
      rec.handler('value')([hp.stubSnap(hp.mockRef('p1'), 99)]);
      expect(spy).toHaveBeenCalled();
    });

    it('should invoke the callback with correct context', function() {
      var ctx = {};
      var spy = jasmine.createSpy().and.callFake(function() {
        expect(this).toBe(ctx);
      });
      var rec = new Rec();
      rec.watch('value', spy, ctx);
      rec.handler('value')(hp.snaps(99));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#unwatch', function() {
    it('should remove correct function', function() {
      var rec = new Rec();
      var spy = jasmine.createSpy();
      rec.watch('value', spy);
      rec.handler('value')(hp.snaps(99));
      rec.unwatch('value', spy);
      rec.handler('value')(hp.snaps(100));
      expect(spy.calls.count()).toBe(1);
    });

    it('should remove for correct context', function() {
      var ctxA = {}, ctxB = {};
      var rec = new Rec();
      var spy = jasmine.createSpy();
      rec.watch('value', spy, ctxA);
      rec.watch('value', spy, ctxB);
      rec.handler('value')(hp.snaps(99));
      rec.unwatch('value', spy, ctxA);
      rec.handler('value')(hp.snaps(100));
      expect(spy.calls.count()).toBe(3);
    });

    it('should remove all functions if no callback specified', function() {
      var rec = new Rec();
      var spy = jasmine.createSpy();
      rec.watch('value', spy);
      rec.watch('value', spy, {});
      rec.unwatch('value');
      rec.handler('value')(hp.snaps(99));
      expect(spy.calls.count()).toBe(0);
    });

    it('should trigger _stop if last event of type', function() {
      var rec = new Rec();
      rec.watch('value', util.noop);
      rec.watch('child_added', util.noop);
      rec.unwatch('value');
      expect(rec._stop).toHaveBeenCalledWith('value', 1);
    });

    it('should not trigger _stop if not last event of type', function() {
      var rec = new Rec();
      rec.watch('value', util.noop);
      rec.watch('value', function() {});
      rec.unwatch('value', util.noop);
      expect(rec._stop).not.toHaveBeenCalled();
    });
  });
});
