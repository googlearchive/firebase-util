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

    it('should blow up if argument is not a function', function() {
      var f = new Filter();
      expect(function() {
        f.add({});
      }).toThrowError(Error);
    });
  });

  describe('#test', function() {
    it('should return true if fn returns true', function() {
      var f = new Filter();
      f.add(function() { return true; });
      expect(f.test({})).toBe(true);
    });

    it('should return false if fn returns false', function() {
      var f = new Filter();
      f.add(function() { return false; });
      expect(f.test({})).toBe(false);
    });

    it('should return false for anything else', function() {
      var f = new Filter();
      f.add(function() {});
      expect(f.test({})).toBe(false);
    });
  });
});