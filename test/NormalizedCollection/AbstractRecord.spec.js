'use strict';

var AbstractRecord = require('../../src/NormalizedCollection/libs/AbstractRecord');

describe('AbstractRecord', function() {
  describe('#getFieldMap', function() {
    it('should return the FieldMap', function() {
      var pm = {}, map = {};
      var rec = new AbstractRecord(pm, map);
      expect(rec.getFieldMap()).toBe(map);
    });
  });

  describe('#getPathMgr', function() {
    it('should return the PathManager', function() {
      var pm = {}, map = {};
      var rec = new AbstractRecord(pm, map);
      expect(rec.getPathMgr()).toBe(pm);
    });
  });

  describe('#watch', function() {
    it('should have tests');
  });

  describe('#unwatch', function() {
    it('should have tests');
  });
});
