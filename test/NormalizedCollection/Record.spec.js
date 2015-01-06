'use strict';

var AbstractRecord      = require('../../src/NormalizedCollection/libs/AbstractRecord.js');
var RecordField         = require('../../src/NormalizedCollection/libs/RecordField.js');
var Record              = require('../../src/NormalizedCollection/libs/Record.js');
var NormalizedSnapshot  = require('../../src/NormalizedCollection/libs/NormalizedSnapshot');
var PathManager         = require('../../src/NormalizedCollection/libs/PathManager');
var FieldMap            = require('../../src/NormalizedCollection/libs/FieldMap');
var Path                = require('../../src/NormalizedCollection/libs/Path');
var hp                  = require('./helpers');
var _                   = require('lodash');

describe('Record', function() {
  describe('#constructor', function() {
    it('should inherit AbstractRecord', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      expect(rec).toBeInstanceOf(AbstractRecord, 'AbstractRecord');
    });
  });

  describe('#child', function() {
    it('should return a RecordField', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      expect(rec.child('foo')).toBeInstanceOf(RecordField, 'RecordField');
    });

    it('should pick the correct path to descend from', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var child = rec.child('bar');
      expect(child.getPathManager().first().parent().url()).toBe(rec.getPathManager().getPath('p2').url());
    });

    it('should have exactly one field', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var child = rec.child('bar');
      expect(child.getFieldMap().length).toBe(1);
    });

    it('should use the primary/first path if none matches the field name', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var child = rec.child('notafieldmatch');
      expect(child.getPathManager().count()).toBe(1);
      expect(child.getPathManager().first().parent().name()).toBe('p1');
    });

    it('should return correct child for a dynamic field');

    it('should blow up if dynamic field is null?');
  });

  describe('#hasChild', function() {
    it('should have tests');
  });

  describe('#getChildSnaps', function() {
    it('should return one snapshot', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn, {f11: 'foo'}, {f99: 'bar'}, true, false);
      expect(rec.getChildSnaps(snaps, 'foo').length).toBe(1);
    });

    it('should be the snapshot for the correct child key', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = rec.getChildSnaps(createSnaps(defaultIdFn, {f11: 'fooval'}, {f99: 'barval'}, true, false), 'foo');
      expect(snaps[0].key()).toBe('f11');
      expect(snaps[0].val()).toBe('fooval');
    });
  });

  describe('#mergeData', function() {
    it('should contain intersection of all snaps and fields', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f10: 'p1.f10val', f99: 'p1.f99val'},
        {f99: 'p2.f99val'},
        333,
        false
      );
      var data = rec.mergeData(snaps, false);
      expect(data).toEqual({
        f10: 'p1.f10val', f99: 'p1.f99val',
        bar: 'p2.f99val',
        p3key: 'record1',
        p3val: 333,
        nest: {
          p4val: false
        }
      });
    });

    it('should include $value for correct path', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn, true, 850, 999, null);
      var data = rec.mergeData(snaps, false);
      expect(data).toEqual({ p3key: 'record1', p3val: 999 });
    });

    it('should include $key for correct path', function() {
      function idFn(pathName) {
        // simulate a dynamic key
        return pathName === 'p3'? 'zed1' : pathName;
      }
      var rec = new Record(makeFieldMap(makePathMgr(idFn)));
      var snaps = createSnaps(idFn, true, 850, 999, null);
      var data = rec.mergeData(snaps, false);
      expect(data).toEqual({ p3key: 'zed1', p3val: 999 });
    });

    it('should use priority from first record when export === true', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f10: 'p1.f10val', f99: 'p1.f99val', $priority: 111},
        {f99: 'p2.f99val', $priority: 222},
        33,
        {$value: false, $priority: 444}
      );
      var data = rec.mergeData(snaps, true);
      expect(data['.priority']).toBe(111);
    });

    it('should include nested priorities if export === true', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f10: 'p1.f10val', f99: 'p1.f99val'},
        {f99: 'p2.f99val', $priority: 222},
        33,
        {$value: false, $priority: 444}
      );
      var data = rec.mergeData(snaps, true);
      expect(data.nest.p4val['.priority']).toBe(444);
      expect(data.nest.p4val['.value']).toBe(false);
    });

    it('should include .value if export == true and value has a priority', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        null, null, {$value: 0, $priority: 1}, null
      );
      var data = rec.mergeData(snaps, true);
      expect(data.p3val).toEqual({'.value': 0, '.priority': 1});
    });

    it('should include correct val for dynamic fields');

    it('should include correct key for dynamic fields');
  });

  describe('#forEachKey', function() {
    it('should include the intersection of fields and snapshots', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var keys = [];
      var aliases = [];
      var expKeys = ['f11', 'f99', 'f99', '$key', '$value', '$value'];
      var expAliases = ['foo', 'f99', 'bar', 'p3key', 'p3val', 'nest.p4val'];
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'},
        {f99: 'p2.f99val', $priority: 222},
        33,
        {$value: false, $priority: 444}
      );
      rec.forEachKey(snaps, function(key, alias) {
        keys.push(key);
        aliases.push(alias);
      });
      expect(keys).toEqual(expKeys);
      expect(aliases).toEqual(expAliases);
    });

    it('should include $key fields if path exists in snapshots', function() {
      var spy = jasmine.createSpy('iterator');
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'},
        {f99: 'p2.f99val', $priority: 222},
        33,
        {$value: false, $priority: 444}
      );
      rec.forEachKey(snaps, spy);
      expect(spy).toHaveBeenCalledWith('$key', 'p3key');
    });

    it('should include $value fields if snapshot value is not null', function() {
      var spy = jasmine.createSpy('iterator');
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'},
        {f99: 'p2.f99val', $priority: 222},
        33,
        {$value: false, $priority: 444}
      );
      rec.forEachKey(snaps, spy);
      expect(spy).toHaveBeenCalledWith('$value', 'nest.p4val');
    });

    it('should not include $value field if snapshot value is null', function() {
      var spy = jasmine.createSpy('iterator');
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'},
        {f99: 'p2.f99val', $priority: 222},
        33,
        null
      );
      rec.forEachKey(snaps, spy);
      expect(spy).not.toHaveBeenCalledWith('$value', 'nest.p4val');
    });

    it('should not include $value field if snapshot does not exist', function() {
      var spy = jasmine.createSpy('iterator');
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'}
      );
      rec.forEachKey(snaps, spy);
      expect(spy).not.toHaveBeenCalledWith('$value', 'nest.p4val');
    });

    it('should evaluate in the correct context', function() {
      var ctx = {};
      var spy = jasmine.createSpy('iterator').and.callFake(function() {
        expect(this).toBe(ctx);
      });
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps(defaultIdFn,
        {f11: 'p1.f11val', f99: 'p1.f99val'}
      );
      rec.forEachKey(snaps, spy, ctx);
      expect(spy).toHaveBeenCalled();
    });

    it('should do something with dynamic paths?');
  });

  describe('#_start', function() {
    it('should invoke on() for all refs/paths', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var refs = _.map(rec.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'on');
        return ref;
      });
      expect(refs.length).toBeGreaterThan(0);
      rec._start('value');
      _.each(refs, function(ref) {
        expect(ref.on).toHaveBeenCalled();
      });
    });

    it('should not invoke on() twice for same event', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var refs = _.map(rec.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'on');
        return ref;
      });
      expect(refs.length).toBeGreaterThan(0);
      rec._start('value');
      rec._start('value');
      rec._start('value');
      _.each(refs, function(ref) {
        expect(ref.on).toHaveCallCount(1);
      });
    });

    it('should invoke on() for multiple events', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var ref = rec.getPathManager().first().reff();
      spyOn(ref, 'on').and.callThrough();
      rec._start('value');
      rec._start('child_added');
      rec._start('child_moved');
      var calls = ref.on.calls;
      expect(ref.on).toHaveCallCount(3);
      expect(calls.argsFor(0)[0]).toBe('value');
      expect(calls.argsFor(1)[0]).toBe('child_added');
      expect(calls.argsFor(2)[0]).toBe('child_moved');
    });
  });

  describe('#_stop', function() {
    it('should not call off() if on() never called', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var refs = _.map(rec.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'off');
        return ref;
      });
      expect(refs.length).toBeGreaterThan(0);
      rec._stop('value');
      _.each(refs, function(ref) {
        expect(ref.off).not.toHaveBeenCalled();
      });
    });

    it('should invoke off() for all refs/paths', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var refs = _.map(rec.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'off');
        return ref;
      });
      expect(refs.length).toBeGreaterThan(0);
      rec._start('value');
      rec._stop('value');
      _.each(refs, function(ref) {
        expect(ref.off).toHaveBeenCalled();
      });
    });

    it('should invoke off() for multiple events', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var refs = _.map(rec.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'off');
        return ref;
      });
      expect(refs.length).toBeGreaterThan(0);
      rec._start('value');
      rec._start('child_removed');
      rec._stop('value');
      rec._stop('child_removed');
      _.each(refs, function(ref) {
        var calls = ref.off.calls;
        expect(ref.off).toHaveCallCount(2);
        expect(calls.argsFor(0)[0]).toBe('value');
        expect(calls.argsFor(1)[0]).toBe('child_removed');
      });
    });

    describe('saveData', function() {
      it('calls update() on the correct path for each field', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          var ref = p.ref();
          spyOn(ref, 'update');
          return ref;
        });
        expect(refs.length).toBe(4);
        rec.saveData({
          f10: 'f10.value', foo: 'foo.value', // p1
          bar: 'bar.value', // p2
          p3val: 'p3val.value',  // p3
          nest: { p4val: 'p4val.value' } // p4
        }, {isUpdate: false});
        _.each(refs, function(ref) {
          switch(ref.parent().key()) {
            case 'path1':
              expect(ref.update).toHaveBeenCalledWith(
                { f10: 'f10.value', f11: 'foo.value', f99: null },
                jasmine.any(Function)
              );
              break;
            case 'path2':
              expect(ref.update).toHaveBeenCalledWith(
                { f20: null, f99: 'bar.value' },
                jasmine.any(Function)
              );
              break;
            case null:
              expect(ref.update).toHaveBeenCalledWith(
                'p3val.value',
                jasmine.any(Function)
              );
              break;
            case 'path4':
              expect(ref.update).toHaveBeenCalledWith(
                'p4val.value',
                jasmine.any(Function)
              );
              break;
            default:
              throw new Error('Unexpected path: ' + ref.name());
          }
        });
      });

      it('discards children not in the map', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          var ref = p.ref().autoFlush();
          spyOn(ref, 'update');
          return ref;
        });
        expect(refs.length).toBe(4);
        rec.saveData({
          f10: 'f10.value', fez: 'should be ignored', // p1
          bar: 'bar.value', // p2
          p3val: 'p3val.value',  // p3
          nest: { p4val: 'p4val.value', fezz: 'should be ignored, too' } // p4
        }, {isUpdate: false});
        _.each(refs, function(ref) {
          expect(ref.update).toHaveBeenCalled();
          var data = ref.update.calls.argsFor(0)[0];
          expect(data).not.toHaveKey('fez');
          expect(data).not.toHaveKey('fezz');
        });
      });

      it('deletes fields in the map but not the data', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'update');
        rec.saveData({
          f10: 'f10.value'
        }, {isUpdate: false});
        expect(ref.update.calls.argsFor(0)[0].f11).toBe(null);
      });

      it('triggers callback after all paths have returned', function() {
        var spy = jasmine.createSpy('update callback');
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          return p.ref();
        });
        rec.saveData({
          f10: 'f10.value'
        }, {isUpdate: false, callback: spy});
        _.each(refs, function(ref, i) {
          ref.flush();
          if( i < refs.length - 1 ) {
            expect(spy).not.toHaveBeenCalled();
          }
        });
        expect(spy).toHaveBeenCalledWith();
      });

      it('triggers callback with correct context', function() {
        var ctx = {};
        var spy = jasmine.createSpy('update callback').and.callFake(function() {
          expect(this).toBe(ctx);
        });
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          return p.ref();
        });
        rec.saveData({
          f10: 'f10.value'
        }, {isUpdate: false, callback: spy, context: ctx});
        _.each(refs, function(ref) {
          ref.flush();
        });
        expect(spy).toHaveBeenCalledWith();
      });

      it('returns an error if any path returns an error', function() {
        var err = new Error('YOLO?');
        var spy = jasmine.createSpy('update callback');
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          return p.ref().autoFlush();
        });
        refs[1].failNext('update', err);
        rec.saveData({foo: 'bar'}, {isUpdate: false, callback: spy});
        expect(spy).toHaveBeenCalledWith(err);
      });

      it('removes all paths if given null', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          spyOn(p.ref(), 'remove');
          return p.ref();
        });
        rec.saveData(null, {isUpdate: false});
        _.each(refs, function(ref, i) {
          expect(ref.remove).toHaveBeenCalled();
        });
      });

      it('only updates fields provided if isUpdate === true', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var refs = _.map(rec.getPathManager().getPaths(), function(p) {
          var ref = p.ref();
          spyOn(ref, 'update');
          return ref;
        });
        expect(refs.length).toBe(4);
        rec.saveData({
          f10: 'f10.value', foo: 'foo.value', // p1
          p3val: 'p3val.value',  // p3
          nest: { p4val: 'p4val.value' } // p4
        }, {isUpdate: true});
        _.each(refs, function(ref) {
          switch(ref.parent().key()) {
            case 'path1':
              expect(ref.update).toHaveBeenCalledWith(
                { f10: 'f10.value', f11: 'foo.value' },
                jasmine.any(Function)
              );
              break;
            case 'path2':
              expect(ref.update).not.toHaveBeenCalled();
              break;
            case null:
              expect(ref.update).toHaveBeenCalledWith(
                'p3val.value',
                jasmine.any(Function)
              );
              break;
            case 'path4':
              expect(ref.update).toHaveBeenCalledWith(
                'p4val.value',
                jasmine.any(Function)
              );
              break;
            default:
              throw new Error('Unexpected path: ' + ref.name());
          }
        });
      });

      it('throws error if non-object passed with isUpdate === true', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        expect(function() {
          rec.saveData(null, {isUpdate: true});
        }).toThrowError(Error);
      });

      it('calls set with a primitive if there is exactly one path', function() {
        var mgr = new PathManager([
          new Path([hp.mockRef(PATHS.p1.url), PATHS.p1.alias])
        ]);
        var rec = new Record(makeFieldMap(mgr));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'set');
        rec.saveData(false, {isUpdate: false});
        expect(ref.set).toHaveBeenCalledWith(false, jasmine.any(Function));
      });

      it('throws an error if multiple paths are set to a primitive', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        expect(function() {
          rec.saveData(false, {isUpdate: false});
        }).toThrowError(Error);
      });

      it('observes priority and adds .priority to the master path', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'update');
        rec.saveData({foo: 'bar'}, {isUpdate: true, priority: 0});
        expect(ref.update).toHaveBeenCalledWith({f11: 'bar', '.priority': 0}, jasmine.any(Function));
      });

      it('calls setWithPriority if a primitive and a priority are given with exactly one path', function() {
        var mgr = new PathManager([
          new Path([hp.mockRef(PATHS.p1.url), PATHS.p1.alias])
        ]);
        var rec = new Record(makeFieldMap(mgr));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'setWithPriority');
        rec.saveData('foo', {isUpdate: false, priority: 'apples'});
        expect(ref.setWithPriority).toHaveBeenCalledWith('foo', 'apples', jasmine.any(Function));
      });

      it('accepts .value', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'update');
        rec.saveData({foo: {'.value': 'bar'}}, {isUpdate: true});
        expect(ref.update).toHaveBeenCalledWith({f11: {'.value': 'bar'}}, jasmine.any(Function));
      });

      it('accepts .priority', function() {
        var rec = new Record(makeFieldMap(makePathMgr()));
        var ref = rec.getPathManager().first().ref();
        spyOn(ref, 'update');
        rec.saveData({foo: {'.value': 'bar', '.priority': 0}}, {isUpdate: true});
        expect(ref.update).toHaveBeenCalledWith({f11: {'.value': 'bar', '.priority': 0}}, jasmine.any(Function));
      });
    });

    describe('value events', function() { //todo-test
      it('should return all snapshots');

      it('should only return when all snapshots are present');

      it('should fire appropriate observers');
    });

    describe('child_added events', function() { //todo-test
      it('should trigger with appropriate child snapshot');

      it('should trigger from any path');

      it('should fire appropriate observers');
    });

    describe('child_removed events', function() { //todo-test
      it('should trigger with appropriate child snapshot');

      it('should trigger from any path');

      it('should fire appropriate observers');
    });

    describe('child_changed events', function() { //todo-test
      it('should trigger with appropriate child snapshot');

      it('should trigger from any path');

      it('should fire appropriate observers');
    });

    describe('child_moved events', function() { //todo-test
      it('should trigger with appropriate child snapshot');

      it('should trigger from any path');

      it('should fire appropriate observers');
    });
  });

  function makePathMgr(idFn) {
    return new PathManager(makePaths(idFn||defaultIdFn));
  }

  function makePaths(idFn) {
    var paths = [];
    _.each(PATHS, function(p) {
      var ref = hp.mockRef(p.url);
      var path = new Path([ref, p.alias]).normChild(idFn(p.alias));
      paths.push(path);
    });
    return paths;
  }

  function makeFieldMap(mgr) {
    var map = new FieldMap(mgr);
    _.each(FIELDS, function(fieldSet, pathName) {
      if( map.getPath(pathName) !== null ) {
        _.each(fieldSet, function(f) {
          map.add(makeFieldProps(f));
        });
      }
    });
    return map;
  }

  function makeFieldProps(f) {
    var parts = f.split(',');
    var props = {key: parts[0]+'.'+parts[1]};
    if( parts[2] ) {
      props.alias = parts[2];
    }
    return props;
  }

  function createSnaps(idFn) {
    var recData = _.toArray(arguments).slice(1);
    var snaps = [];
    var keys = _.keys(PATHS).reverse();
    _.each(recData, function(dat) {
      var pathName = keys.pop(), pri = null;
      if(_.isObject(dat) && _.has(dat, '$priority')) {
        pri = dat.$priority;
        if(_.has(dat, '$value')) {
          dat = dat.$value;
        }
        else {
          delete dat.$priority;
        }
      }
      snaps.push(hp.stubSnap(hp.mockRef(PATHS[pathName].url).child(idFn(pathName)), dat, pri));
    });
    return snaps;
  }

  var PATHS = {
    p1: {id: 'path1', alias: 'p1', url: 'Mock1://path1'},
    p2: {id: 'path2', alias: 'p2', url: 'Mock1://p2parent/path2'},
    p3: {id: null,    alias: 'p3', url: 'Mock2://'},
    p4: {id: 'path4', alias: 'p4', url: 'Mock1://path4', dep: 'p3.$value'}
  };

  var FIELDS = {
    p1: ['p1,f10', 'p1,f11,foo', 'p1,f99'],
    p2: ['p2,f20', 'p2,f99,bar'],
    p3: ['p3,$key,p3key', 'p3,$value,p3val'],
    p4: ['p4,$value,nest.p4val']
  };

  function defaultIdFn(pathName) {
    return 'record1';
  }

});