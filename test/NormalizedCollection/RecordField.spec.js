'use strict';

var AbstractRecord = require('../../src/NormalizedCollection/libs/AbstractRecord.js');
var RecordField = require('../../src/NormalizedCollection/libs/RecordField.js');
var NormalizedSnapshot = require('../../src/NormalizedCollection/libs/NormalizedSnapshot');
var hp = require('./helpers');
var _ = require('lodash');

describe('RecordField', function() {
  describe('#constructor', function() {
    it('should be instanceof AbstractRecord', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      expect(rec).toBeInstanceOf(AbstractRecord);
    });
  });

  describe('#child', function() {
    it('should be a RecordField', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      expect(rec.child('foo')).toBeInstanceOf(RecordField);
    });

    it('should be for the correct key', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      var fm = rec.child('foo').getFieldMap();
      expect(fm.get('foo').key).toBe('foo.$value');
    });
  });

  describe('#getChildSnaps', function() {
    it('should just return child of first snapshot', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      var res = rec.getChildSnaps(hp.snaps({foo: 'bar'}), 'foo');
      expect(res).toBeAn('array');
      expect(res.length).toBe(1);
      expect(res[0].name()).toBe('foo');
      expect(res[0].val()).toBe('bar');
    });
  });

  describe('#mergeData', function() {
    it('should just return val()', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), false)).toEqual(data);
    });

    it('should just return exportVal() if isExport', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), true)).toEqual({foo: 'bar', '.priority': 1});
    });
  });

  describe('#forEachKey', function() {
    it('should include any field in the map and snapshots', function() {
      var data = {f10: 'foo', f11: 'bar'};
      var keys = _.keys(data).reverse();
      var spy = jasmine.createSpy().and.callFake(function(nextKey) {
        expect(nextKey).toBe(keys.pop());
      });
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec.forEachKey(hp.snaps(data), spy);
      expect(spy).toHaveBeenCalled();
    });


    it('should evaluate in the correct context', function() {
      var ctx = {};
      var spy = jasmine.createSpy().and.callFake(function() {
        expect(this).toBe(ctx);
      });
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec.forEachKey(hp.snaps({f10: true, f11: false}), spy, ctx);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('#_start', function() {
    it('should invoke on() for ref', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec._start('value');
      var spy = rec.getPathMgr().first().ref().on;
      expect(spy).toHaveBeenCalled();
    });

    it('should use correct event', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec._start('value');
      var spy = rec.getPathMgr().first().ref().on;
      expect(spy.calls.argsFor(0)[0]).toBe('value');
    });
  });

  describe('#_stop', function() {
    it('should invoke off() for ref', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec._stop('value');
      var spy = rec.getPathMgr().first().ref().off;
      expect(spy).toHaveBeenCalled();
    });

    it('should use correct event', function() {
      var rec = new RecordField(hp.stubPathMgr(['p1']), hp.stubFieldMap());
      rec._stop('value');
      var spy = rec.getPathMgr().first().ref().off;
      expect(spy.calls.argsFor(0)[0]).toBe('value');
    });
  });
});
