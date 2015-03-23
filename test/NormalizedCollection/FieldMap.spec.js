'use strict';

var FieldMap = require('../../src/NormalizedCollection/libs/FieldMap');
var hp = require('./helpers');
var _ = require('lodash');

describe('FieldMap', function() {
  describe('#add', function() {
    it('should add field into the list', function() {
      var map = new FieldMap(hp.stubPathMgr());
      expect(map.length).toBe(0);
      map.add('p1.field1');
      map.add({ key: 'p1.field2', alias: 'foo' });
      expect(map.length).toBe(2);
    });

    it('should throw error if duplicate alias', function() {
      var map = new FieldMap(hp.stubPathMgr());
      expect(map.length).toBe(0);
      map.add('p1.field1');
      expect(function() {
        map.add({ key: 'p3.field1', alias: 'field1' });
      }).toThrowError(Error);
    });

    it('should accept duplicate field if alias is different', function() {
      var map = new FieldMap(hp.stubPathMgr());
      expect(map.length).toBe(0);
      map.add('p1.field1');
      expect(function() {
        map.add({ key: 'p2.field1', alias: 'foo' });
      }).not.toThrowError(Error);
    });

    it('should throw an error if path is not in the pathMgr', function() {
      var map = new FieldMap(hp.stubPathMgr());
      expect(function() {
        map.add('notapath.field1');
      }).toThrowError(Error);
    });

    it('should set isNested=true if alias references a nested child node', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add({ key: 'p1.field2', alias: 'foo.bar' });
      expect(map.getField('foo.bar').isNested).toBe(true);
    });

    it('should set isNested=false if alias does not ref a nested child', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add({ key: 'p1.field2', alias: 'foo' });
      expect(map.getField('foo').isNested).toBe(false);
    });
  });

  describe('#getPath', function() {
    it('should return path for a given alias', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add('p1.field1');
      expect(map.pathFor('field1').name()).toBe('p1');
    });

    it('should return first path if field does not exist', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add('p1.field1');
      map.add('p2.field2');
      expect(map.pathFor('notafield').name()).toBe('p1');
    });
  });

  describe('#fieldsFor', function() {
    it('should return array of fields matching a path', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add('p1.field1');
      map.add('p1.field2');
      map.add('p2.field3');
      map.add('p3.field4');
      var list = map.fieldsFor('p1');
      var exp = ['field1', 'field2'];
      expect(list.length).toBe(2);
      for(var i=0; i < 2; i++) {
        expect(list[i].pathName).toBe('p1');
        expect(list[i].id).toBe(exp[i]);
      }
    });
  });

  describe('#getField', function() {
    it('should return a field by alias', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add('p1.field1');
      map.add({ key: 'p2.field2', alias: 'foo' });
      map.add({ key: 'p2.foo', alias: 'bar' });
      var res = map.getField('foo');
      expect(res.key).toBe('p2.field2');
    });

    it('should return null if field not found', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add('p1.field1');
      map.add({ key: 'p2.field2', alias: 'foo' });
      expect(map.getField('bar')).toBe(null);
    });
  });

  describe('#aliasFor', function() {
    it('should return field id if no alias provided', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      var p = pm.getPath('p1');
      map.add('p1.field1');
      expect(map.aliasFor(p.child('field1').url())).toBe('field1');
    });

    it('should return alias if provided', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      var p = pm.getPath('p2');
      map.add('p1.field1');
      map.add({key: 'p2.field2', alias: 'foo'});
      expect(map.aliasFor(p.child('field2').url())).toBe('foo');
    });

    it('should return null if not found', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      var p = pm.getPath('p2');
      map.add('p1.field1');
      map.add({key: 'p2.field2', alias: 'foo'});
      expect(map.aliasFor(p.child('bar').url())).toBe(null);
    });
  });

  describe('#extractData', function() {
    it('should only include values in the map', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add('p1.field2');
      map.add({key: 'p2.field1', alias: 'foo'});
      map.add('p3.field3');
      var snapshot = hp.stubSnap(
        hp.mockRef('path1'),
        {field1: 'p1.f1', field2: 'p1.f2', foo: 'p2.f2', bar: 'p3.f3'}
      );
      var res = map.extractData(snapshot);
      expect(res).toEqual({field1: 'p1.f1', field2: 'p1.f2'});
    });

    it('should not add a value that is null', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add('p1.field2');
      var snapshot = hp.stubSnap(hp.mockRef('path1'), {field1: 'p1.f1', field2: null});
      var res = map.extractData(snapshot);
      expect(res).not.toHaveKey('field2');
    });

    it('should add value with the appropriate alias', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add({key: 'p1.field2', alias: 'foo'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), {field1: 'p1.f1', field2: 'p1.f2'});
      var res = map.extractData(snapshot);
      expect(res.foo).toBe('p1.f2');
    });

    it('should add $key', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add({key: 'p1.$key', alias: 'foo'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), {field1: 'p1.f1', field2: 'p1.f2'});
      var res = map.extractData(snapshot);
      expect(res.foo).toBe('path1');
    });

    it('should add $value', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo'});
      map.add({key: 'p2.$value', alias: 'bar'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), 'hello');
      var res = map.extractData(snapshot);
      expect(res.foo).toBe('hello');
    });

    it('should add value at a nested alias (containing . separators)', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo.bar.baz'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), 'hello');
      var res = map.extractData(snapshot);
      expect(res).toEqual({foo: {bar: {baz: 'hello'}}});
    });

    it('should not create nested objects if value is null', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo.bar'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), null);
      var res = map.extractData(snapshot);
      expect(res.foo).toBeUndefined();
    });

    it('should extend nested objects rather than replacing them (works with multiple nested keys)', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo.key'});
      map.add({key: 'p1.$value', alias: 'foo.val'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), false);
      var res = map.extractData(snapshot);
      expect(res).toEqual({foo: {key: 'path1', val: false}});
    });

    it('should include nested priorities', function() {
      var pm = hp.stubPathMgr();
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo'});
      map.add({key: 'p1.field1', alias: 'bar.baz'});
      var snapshot = hp.stubSnap(hp.mockRef('path1'), {field1: 0}, function(snap) {
        if (snap.key() === 'field1') {
          return 100;
        }
        else {
          return null;
        }
      });
      var res = map.extractData(snapshot, true);
      expect(res).toEqual({foo: 'path1', bar: {baz: {'.value': 0, '.priority': 100}}});
    });
  });

  describe('#denest', function() {
    it('sets the paths correctly, even if they have no data', function() {
      var map = new FieldMap(hp.stubPathMgr());
      var denested = map.denest({});
      expect(_.keys(denested)).toEqual(['p1', 'p2', 'p3', 'p4']);
      expect(denested.p1.path.name()).toBe('p1');
      expect(denested.p2.path.name()).toBe('p2');
      expect(denested.p3.path.name()).toBe('p3');
      expect(denested.p4.path.name()).toBe('p4');
    });

    it('returns a flattened map of fields', function() {
      var data = {
        f10: 'f10.value',
        foo: 'foo.value',
        bar: { baz: 'baz.value' },
        p3key: 'record1',
        p3val: 0,
        baz: {p4val: 'p4val.value', foo: {bar: {bazbaz: 'bazbaz.value' } } }
      };
      var map = new FieldMap(hp.stubPathMgr());
      map.add({key: 'p1.f10'});
      map.add({key: 'p1.f11', alias: 'foo'});
      map.add({key: 'p2.f20'});
      map.add({key: 'p2.f99', alias: 'bar'});
      map.add({key: 'p2.f300', alias: 'baz.foo.bar.bazbaz'});
      map.add({key: 'p3.$value', alias: 'p3val'});
      map.add({key: 'p3.$key', alias: 'p3key'});
      map.add({key: 'p4.$value', alias: 'baz.p4val'});
      var denested = map.denest(data);
      expect(denested.p1.data).toEqual({ f10: 'f10.value', f11: 'foo.value' });
      expect(denested.p2.data).toEqual({ f99: { baz: 'baz.value' }, f300: 'bazbaz.value' });
      expect(denested.p3.data).toEqual(0);
      expect(denested.p4.data).toEqual('p4val.value');
    });
  });

  describe('#forEach', function() {
    it('should have tests');
  });

  describe('#snapFor', function() {
    it('returns snapshot for correct path, based on field', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add({key: 'p1.f10', alias: 'foo'});
      map.add({key: 'p2.f20', alias: 'bar'});
      var snaps = hp.snaps(
        {f10: 'bar'},
        {f20: 'foo'}
      );
      var res = map.snapFor(snaps, 'bar');
      expect(res.ref().toString()).toBe(map.getPath('p2').url());
    });

    it('returns correct snapshot for dynamic path, based on field', function() {
      var map = new FieldMap(hp.stubPathMgr());
      map.add({key: 'p1.f10', alias: 'foo'});
      map.add({key: 'p2.f20', alias: 'bar'});
      map.add({key: 'p3.$value', alias: 'baz'});
      map.add({key: 'p4.$value', alias: 'boo'});
      var snaps = hp.snaps(
        function(pathName) {
          var path = map.getPath(pathName);
          if( path.name() === 'p4' ) {
            return path.ref().child('hello');
          }
          return path.ref();
        },
        {f10: 'bar'},
        {f20: 'foo'},
        'hello',
        'world'
      );
      var res = map.snapFor(snaps, 'boo');
      expect(res).toBeAn('object');
      expect(res.ref().toString()).toBe(map.getPath('p4').url()+'/hello');
    });
  });

  describe('#getPathManager', function() {
    it('should have tests');
  });

  describe('::recordMap', function() {
    it('should return a FieldMap');

    it('should return same map keys as parent');

    it('should return paths one level deeper than parent');

    it('should return non-adjusted path for dynamic children');
  });
});
