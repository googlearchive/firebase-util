'use strict';

var FieldMap = require('../../src/NormalizedCollection/libs/FieldMap');
var util = require('../../src/common');

describe('FieldMap', function() {
  describe('#add', function() {
    it('should add field into the list', function() {
      var map = new FieldMap();
      expect(map.length).toBe(0);
      map.add('path1.field1');
      map.add({ key: 'path1.field2', alias: 'foo' });
      expect(map.length).toBe(2);
    });

    it('should throw error if duplicate alias', function() {
      var map = new FieldMap();
      expect(map.length).toBe(0);
      map.add('path1.field1');
      expect(function() {
        map.add({ key: 'path3.field1', alias: 'field1' });
      }).toThrowError(Error);
    });
  });

  describe('#pathFor', function() {
    it('should return path for a given alias', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      expect(map.pathFor('field1')).toBe('path1');
    });

    it('should return null if field not exist', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      expect(map.pathFor('notafield')).toBe(null);
    });
  });

  describe('#fieldsFor', function() {
    it('should return array of fields matching a path', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      map.add('path1.field2');
      map.add('path2.field3');
      map.add('path3.field4');
      var list = map.fieldsFor('path1');
      var exp = ['field1', 'field2'];
      expect(list.length).toBe(2);
      for(var i=0; i < 2; i++) {
        expect(list[i].path).toBe('path1');
        expect(list[i].id).toBe(exp[i]);
      }
    });
  });

  describe('#get', function() {
    it('should return a field by alias', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      map.add({ key: 'path2.field2', alias: 'foo' });
      map.add({ key: 'path2.foo', alias: 'bar' });
      var res = map.get('foo');
      expect(res.raw).toBe('path2.field2');
    });

    it('should return null if field not found', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      map.add({ key: 'path2.field2', alias: 'foo' });
      expect(map.get('bar')).toBe(null);
    });
  });

  describe('#copy', function() {
    it('should have the same fields', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      map.add('path2.field2');
      var copy = map.copy();
      expect(copy.length).toBe(2);
      util.each(map.fields, function(f) {
        var name = f.name();
        expect(copy.get(name).name()).toBe(f.name());
      });
    });

    it('should have unique references', function() {
      var map = new FieldMap();
      map.add('path1.field1');
      map.add('path2.field2');
      var copy = map.copy();
      util.each(map.fields, function(f) {
        expect(copy.fields[f.name()]).not.toBe(f);
      });
    });
  });
});
