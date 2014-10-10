'use strict';

var FieldMap = require('../../src/NormalizedCollection/libs/FieldMap');
var util = require('../../src/common');

describe('FieldMap', function() {
  describe('#add', function() {
    it('should add field into the list', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path2.p2'));
      expect(map.length).toBe(0);
      map.add('p1.field1');
      map.add({ key: 'p1.field2', alias: 'foo' });
      expect(map.length).toBe(2);
    });

    it('should throw error if duplicate alias', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path3.p3'));
      expect(map.length).toBe(0);
      map.add('p1.field1');
      expect(function() {
        map.add({ key: 'p3.field1', alias: 'field1' });
      }).toThrowError(Error);
    });

    it('should accept duplicate field if alias is different', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path2.p2'));
      expect(map.length).toBe(0);
      map.add('p1.field1');
      expect(function() {
        map.add({ key: 'p2.field1', alias: 'foo' });
      }).not.toThrowError(Error);
    });

    it('should throw an error if path is not in the pathMgr', function() {
      var map = new FieldMap(stubPathMgr('path1.p1'));
      expect(function() {
        map.add('path2.field1');
      }).toThrowError(Error);
    });
  });

  describe('#getPath', function() {
    it('should return path for a given alias', function() {
      var map = new FieldMap(stubPathMgr('path1.p1'));
      map.add('p1.field1');
      expect(map.pathFor('field1').name()).toBe('p1');
    });

    it('should return first path if field does not exist', function() {
      var map = new FieldMap(stubPathMgr('path1', 'path2'));
      map.add('path1.field1');
      map.add('path2.field2');
      expect(map.pathFor('notafield').name()).toBe('path1');
    });
  });

  describe('#fieldsFor', function() {
    it('should return array of fields matching a path', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path2.p2', 'path3'));
      map.add('p1.field1');
      map.add('p1.field2');
      map.add('p2.field3');
      map.add('path3.field4');
      var list = map.fieldsFor('p1');
      var exp = ['field1', 'field2'];
      expect(list.length).toBe(2);
      for(var i=0; i < 2; i++) {
        expect(list[i].pathName).toBe('p1');
        expect(list[i].id).toBe(exp[i]);
      }
    });
  });

  describe('#get', function() {
    it('should return a field by alias', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path2.p2'));
      map.add('p1.field1');
      map.add({ key: 'p2.field2', alias: 'foo' });
      map.add({ key: 'p2.foo', alias: 'bar' });
      var res = map.get('foo');
      expect(res.key).toBe('p2.field2');
    });

    it('should return null if field not found', function() {
      var map = new FieldMap(stubPathMgr('path1.p1', 'path2.p2'));
      map.add('p1.field1');
      map.add({ key: 'p2.field2', alias: 'foo' });
      expect(map.get('bar')).toBe(null);
    });
  });

  describe('#aliasFor', function() {
    it('should return field id if no alias provided', function() {
      var pm = stubPathMgr('path1.p1', 'path2');
      var map = new FieldMap(pm);
      var p = pm.getPath('p1');
      map.add('p1.field1');
      expect(map.aliasFor(p.url(), 'field1')).toBe('field1');
    });

    it('should return alias if provided', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2');
      var map = new FieldMap(pm);
      var p = pm.getPath('p2');
      map.add('p1.field1');
      map.add({key: 'p2.field2', alias: 'foo'});
      expect(map.aliasFor(p.url(), 'field2')).toBe('foo');
    });

    it('should return null if not found', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2');
      var map = new FieldMap(pm);
      var p = pm.getPath('p2');
      map.add('p1.field1');
      map.add({key: 'p2.field2', alias: 'foo'});
      expect(map.aliasFor(p.url(), 'bar')).toBe(null);
    });
  });

  describe('#extractData', function() {
    it('should only include values in the map', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add('p1.field2');
      map.add({key: 'p2.field1', alias: 'foo'});
      map.add('path3.field3');
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 'p1.f1', field2: 'p1.f2', foo: 'p2.f2', bar: 'p3.f3'}));
      expect(res).toEqual({field1: 'p1.f1', field2: 'p1.f2'});
    });

    it('should not add a value that is null', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add('p1.field2');
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 'p1.f1', field2: null}));
      expect(res).not.toHaveKey('field2');
    });

    it('should add value with the appropriate alias', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add({key: 'p1.field2', alias: 'foo'});
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 'p1.f1', field2: 'p1.f2'}));
      expect(res.foo).toBe('p1.f2');
    });

    it('should add $key', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.field1');
      map.add({key: 'p1.$key', alias: 'foo'});
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 'p1.f1', field2: 'p1.f2'}));
      expect(res.foo).toBe('path1');
    });

    it('should add $value', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo'});
      map.add({key: 'p2.$value', alias: 'bar'});
      var res = map.extractData(stubSnap(stubRef('path1'), 'hello'));
      expect(res.foo).toBe('hello');
    });

    it('should add value at a nested alias (containing . separators)', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo.bar.baz'});
      var res = map.extractData(stubSnap(stubRef('path1'), 'hello'));
      expect(res).toEqual({foo: {bar: {baz: 'hello'}}});
    });

    it('should not create nested objects if value is null', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$value', alias: 'foo.bar'});
      var res = map.extractData(stubSnap(stubRef('path1'), null));
      expect(res.foo).toBeUndefined();
    });

    it('should extend nested objects rather than replacing them (works with multiple nested keys)', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo.key'});
      map.add({key: 'p1.$value', alias: 'foo.val'});
      var res = map.extractData(stubSnap(stubRef('path1'), false));
      expect(res).toEqual({foo: {key: 'path1', val: false}});
    });

    it('should not use .value for primitive if isExport but no priority', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo'});
      map.add({key: 'p1.field1', alias: 'bar.baz'});
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 0}), true);
      expect(res).toEqual({foo: 'path1', bar: {baz: 0}});
    });

    it('should use .value for primitive if isExport and there is a priority', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo'});
      map.add({key: 'p1.field1', alias: 'f1'});
      var snapshot = stubSnap(stubRef('path1'), {field1: 0}, false);
      var res = map.extractData(snapshot, true);
      expect(res).toEqual({foo: 'path1', f1: 0, '.priority': false});
    });

    it('should include .priority for values if isExport', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.$key');
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 0}, 100), true);
      expect(res).toEqual({'$key': 'path1', '.priority': 100});
    });

    it('should not include null priority', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add('p1.$key');
      var res = map.extractData(stubSnap(stubRef('path1'), {field1: 0}, 100), null);
      expect(res['.priority']).toBeUndefined();
    });

    it('should include nested priorities', function() {
      var pm = stubPathMgr('path1.p1', 'path2.p2', 'path3');
      var map = new FieldMap(pm);
      map.add({key: 'p1.$key', alias: 'foo'});
      map.add({key: 'p1.field1', alias: 'bar.baz'});
      var snapshot = stubSnap(stubRef('path1'), {field1: 0}, function (snap) {
        if (snap.name() === 'field1') {
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

  function stubPathMgr() {
    var paths = stubPaths(util.toArray(arguments));
    var mgr = jasmine.createSpyObj('PathManager', ['getPath', 'first', 'getPathName', 'child']);
    mgr.getPath.and.callFake(function(fieldName) {
      return paths[fieldName] || null;
    });
    mgr.first.and.callFake(function() { return paths[util.keys(paths)[0]]; });
    mgr.getPathName.and.callFake(function(url) {
      var p = util.find(paths, function(p) {
        return p.url() === url;
      });
      return p? p.name() : null;
    });
    mgr.child.and.callFake(function(key) {
      return stubPathMgr.apply(null, util.map(paths, function(p) { return p.child(key); }));
    });
    return mgr;
  }

  function stubPaths(pathList) {
    var paths = {};
    util.each(pathList, function(p) {
      var parts = p.split('.');
      var alias = parts[1]||parts[0];
      paths[alias] = stubPath(parts[0], alias);
    });
    return paths;
  }

  function stubPath(path, alias, url) {
    var p = jasmine.createSpyObj('Path', ['name', 'id', 'url', 'child']);
    p.name.and.callFake(function() { return alias; });
    p.id.and.callFake(function() { return path; });
    p.url.and.callFake(function() { return (url? url + '/' : 'Mock://') + path; });
    p.child.and.callFake(function(key) { return stubPath(key, key, p.url()); });
    return p;
  }

  function stubSnap(ref, data, pri) {
    if( arguments.length === 0 ) { ref = stubRef(/* root */); }
    if( arguments.length < 2 ) { data = null; }
    if( arguments.length < 3 ) { pri = null; }
    var obj = jasmine.createSpyObj('snapshot',
      ['name', 'ref', 'val', 'forEach', 'child', 'hasChild', 'getPriority', 'exportVal']
    );
    obj.name.and.callFake(
      function() { return ref.name(); }
    );
    obj.ref.and.callFake(
      function() { return ref; }
    );
    obj.child.and.callFake(
      function(key) {
        return stubSnap(ref.child(key), util.has(data, key)? data[key] : null, typeof pri === 'function'? pri : null);
      }
    );
    obj.val.and.callFake(
      function() { return data }
    );
    obj.hasChild.and.callFake(
      function(key) { return util.has(data, key); }
    );
    obj.forEach.and.callFake(
      function(callback, context) {
        var res = false;
        util.each(data, function(v,k) {
          if( res !== true ) {
            res = callback.call(context, obj.child(k)) === true;
          }
        });
        return res;
      }
    );
    obj.getPriority.and.callFake(
      function() { return typeof pri === 'function'? pri(obj) : pri; }
    );
    obj.exportVal.and.callFake(
      function() {
        var pri = obj.getPriority();
        if( util.isObject(data) ) {
          var out = {};
          if( pri !== null ) { out['.priority'] = pri; }
          obj.forEach(function(ss) {
            out[ss.name()] = ss.exportVal();
          });
          return out;
        }
        else if( pri !== null ) {
          return { '.value': data, '.priority': pri };
        }
        else {
          return data;
        }
      }
    );
    return obj;
  }

  function stubRef(pathName) {
    if( arguments.length === 0 ) { pathName = null; } // root
    var obj = jasmine.createSpyObj('ref', ['name', 'child', 'ref', 'toString']);
    obj.child.and.callFake(function(key) { return stubRef(key); });
    obj.ref.and.callFake(function() { return obj; });
    obj.name.and.callFake(function() { return pathName; });
    obj.toString.and.callFake(function() { return 'Mock://' + pathName; });
    return obj;
  }
});
