'use strict';

var Filter = require('../../src/NormalizedCollection/libs/Filter.js');

describe('Filter', function() {
  describe('#add', function() {
    it('should add criteria', function() {
      function fn() {}
      var f = new Filter();
      expect(f.criteria.length).toBe(0);
      f.add(fn);
      expect(f.criteria.length).toBe(1);
    });
  });

  describe('#test', function() {
    it('should iterate with data, key, and priority', function() {
      var spy = jasmine.createSpy('filter callback');
      var f = new Filter();
      var dat = {};
      f.add(spy);
      f.test(dat, 'foo', 'bar');
      expect(spy).toHaveBeenCalledWith(dat, 'foo', 'bar');
    });

    it('should return true if fn returns true', function() {
      var f = new Filter();
      f.add(function() { return true; });
      expect(f.test({}, 'foo', 'bar')).toBe(true);
    });

    it('should return false if fn returns false', function() {
      var f = new Filter();
      f.add(function() { return false; });
      expect(f.test({}, 'foo', 'bar')).toBe(false);
    });

    it('should return false for anything else', function() {
      var f = new Filter();
      f.add(function() {});
      expect(f.test({}, 'foo', 'bar')).toBe(false);
    });
  });
});