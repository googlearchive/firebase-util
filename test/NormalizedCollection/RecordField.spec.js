'use strict';

var AbstractRecord = require('../../src/NormalizedCollection/libs/AbstractRecord.js');
var RecordField = require('../../src/NormalizedCollection/libs/RecordField.js');

describe('RecordField', function() {
  var hp;
  beforeEach(function() {
    hp = this.helpers;
  });

  describe('#constructor', function() {
    it('should be instanceof AbstractRecord', function() {
      var rec = new RecordField(hp.stubPathMgr(), hp.stubFieldMap());
      expect(rec).toBeInstanceOf(AbstractRecord);
    });
  });

  describe('#child', function() {
    it('should be a RecordField', function() {
      var rec = new RecordField(hp.stubPathMgr('path1'), hp.stubFieldMap(['path1.field1']));
      expect(rec.child('foo')).toBeInstanceOf(RecordField);
    });

    it('should be for the correct key', function() {
      var rec = new RecordField(hp.stubPathMgr('path1'), hp.stubFieldMap(['path1.field1']));
      var fm = rec.child('foo').getFieldMap();
      expect(fm.get('foo').key).toBe('foo.$value');
    });
  });

  describe('#getChildSnaps', function() {
    it('should just return child of first snapshot', function() {
      var rec = new RecordField(hp.stubPathMgr('path1'), hp.stubFieldMap(['path1.field1']));
      var data = {foo: 'bar'};
      var res = rec.getChildSnaps(hp.snaps(data, {bar: 'baz'}), 'foo');
      expect(res).toBeAn('array');
      expect(res.length).toBe(1);
      expect(res[0].name()).toBe('foo');
      expect(res[0].val()).toBe('bar');
    });
  });

  describe('#mergeData', function() {
    it('should just return val()', function() {
      var rec = new RecordField(hp.stubPathMgr('path1'), hp.stubFieldMap(['path1.field1']));
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), false)).toEqual(data);
    });

    it('should just return exportVal() if isExport', function() {
      var rec = new RecordField(hp.stubPathMgr('path1'), hp.stubFieldMap(['path1.field1']));
      var data = {foo: 'bar'};
      expect(rec.mergeData(hp.snaps(data), true)).toEqual({foo: 'bar', '.priority': 1});
    });
  });


  describe('watch', function() {
    it('should trigger callbacks with a Snapshot object'); //todo-test

    it('should include one snapshot for the specific child'); //todo-test
  });

  describe('#_start', function() {
    it('should invoke on() for all refs/paths'); //todo-test
  });

  describe('#_stop', function() {
    it('should invoke off() for all refs/paths'); //todo-test
  });
});
