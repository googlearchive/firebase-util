'use strict';

var NormalizedCollection = require('../../src/NormalizedCollection/libs/NormalizedCollection');
var hp = require('./helpers');

describe('NormalizedCollection', function() {
  describe('<constructor>', function() {
    it('should accept a query as a parameter', function() {
      var fb = hp.liveRef();
      var q = fb.child('foo').orderByChild('number').limitToLast(10);
      var r = fb.child('bar').orderByChild('string').limitToFirst(5);
      expect(function() {
        new NormalizedCollection(q, r).select('foo.string', 'bar.number').ref();
      }).not.toThrowError();
    });

    it('should accept a NormalizedRef as a parameter', function() {
      var fb = hp.liveRef();
      var nc1 = new NormalizedCollection(fb.child('foo'), fb.child('bar'))
        .select('foo.string', 'bar.number').ref();
      expect(function() {
        new NormalizedCollection([nc1, 'join'], fb.child('baz')).select('join.string', 'baz.number').ref();
      }).not.toThrowError();
    });
  });

  describe('#filter', function() {
    it('should blow up if filter is not a function');
  });
});