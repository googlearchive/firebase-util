'use strict';

var AbstractRecord = require('../../src/NormalizedCollection/libs/AbstractRecord.js');
var RecordField = require('../../src/NormalizedCollection/libs/RecordField.js');
var NormalizedSnapshot = require('../../src/NormalizedCollection/libs/NormalizedSnapshot');
var PathManager = require('../../src/NormalizedCollection/libs/PathManager');
var Path = require('../../src/NormalizedCollection/libs/Path');
var hp = require('./helpers');
var _ = require('lodash');

describe('RecordField', function() {
  describe('#constructor', function() {
    it('should be instanceof AbstractRecord', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value'], ['p1']));
      expect(rec).toBeInstanceOf(AbstractRecord);
    });

    it('should throw error if more than one path', function() {
      expect(function() {
        new RecordField(hp.stubFieldMap(['p1,$value'], ['p1', 'p2']));
      }).toThrowError(Error);
    });

    it('should throw error if more than one field', function() {
      expect(function() {
        new RecordField(hp.stubFieldMap(['p1,$value', 'p1,foo'], ['p1']));
      }).toThrowError(Error);
    });
  });

  describe('#child', function() {
    it('should be a RecordField', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value'], ['p1']));
      expect(rec.child('foo')).toBeInstanceOf(RecordField);
    });

    it('should be for the correct key', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var fm = rec.child('foo').getFieldMap();
      expect(fm.getField('foo').key).toBe('foo.$value');
    });
  });

  describe('#hasChild', function() {
    it('should have tests');
  });

  describe('#getChildSnaps', function() {
    it('should just return child of first snapshot', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var res = rec.getChildSnaps(hp.snaps({foo: 'bar'}), 'foo');
      expect(res).toBeAn('array');
      expect(res.length).toBe(1);
      expect(res[0].key()).toBe('foo');
      expect(res[0].val()).toBe('bar');
    });
  });

  describe('#mergeData', function() {
    it('should just return val()', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), false)).toEqual(data);
    });

    it('should just return exportVal() if isExport', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), true)).toEqual({foo: 'bar', '.priority': 1});
    });
  });

  describe('#forEachKey', function() {
    it('should iterate all snapshot children regardless of field map', function() {
      var data = {foo: 'fooval', bar: 'barval'};
      var keys = _.keys(data).reverse();
      var count = keys.length;
      var spy = jasmine.createSpy('iterator').and.callFake(function(nextKey, nextAlias) {
        var exp = keys.pop();
        expect(nextKey).toBe(exp);
        expect(nextAlias).toBe(exp);
      });
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      rec.forEachKey(hp.snaps(data), spy);
      expect(spy).toHaveCallCount(count);
    });

    it('should skip if null', function() {
      var spy = jasmine.createSpy('iterator');
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      rec.forEachKey(hp.snaps(null), spy);
      expect(spy).toHaveCallCount(0);
    });

    it('should evaluate in the correct context', function() {
      var ctx = {};
      var spy = jasmine.createSpy('iterator').and.callFake(function() {
        expect(this).toBe(ctx);
      });
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      rec.forEachKey(hp.snaps({f10: true, f11: false}), spy, ctx);
      expect(spy).toHaveCallCount(2);
    });
  });

  describe('#_start', function() {
    it('should invoke on() for ref', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var spy = spyOn(rec.getPathManager().first().ref(), 'on');
      rec._start('value');
      expect(spy).toHaveBeenCalled();
    });

    it('should use correct event', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var spy = spyOn(rec.getPathManager().first().ref(), 'on');
      rec._start('value');
      expect(spy.calls.argsFor(0)[0]).toBe('value');
    });
  });

  describe('#_stop', function() {
    it('should invoke off() for ref', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var spy = spyOn(rec.getPathManager().first().ref(), 'off');
      rec._stop('value');
      expect(spy).toHaveBeenCalled();
    });

    it('should use correct event', function() {
      var rec = new RecordField(hp.stubFieldMap(['p1,$value,foo'], ['p1']));
      var spy = spyOn(rec.getPathManager().first().ref(), 'off');
      rec._stop('value');
      expect(spy.calls.argsFor(0)[0]).toBe('value');
    });
  });

  describe('value events', function() {
    it('should fire appropriate observers');
  });

  describe('child_added events', function() {
    it('should fire appropriate observers');
  });

  describe('child_removed events', function() {
    it('should fire appropriate observers');
  });

  describe('child_changed events', function() {
    it('should fire appropriate observers');
  });

  describe('child_moved events', function() {
    it('should fire appropriate observers');
  });
});
