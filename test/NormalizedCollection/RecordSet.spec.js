'use strict';

var AbstractRecord      = require('../../src/NormalizedCollection/libs/AbstractRecord.js');
var RecordSet         = require('../../src/NormalizedCollection/libs/RecordSet.js');
var Record              = require('../../src/NormalizedCollection/libs/Record.js');
var NormalizedSnapshot  = require('../../src/NormalizedCollection/libs/NormalizedSnapshot');
var PathManager         = require('../../src/NormalizedCollection/libs/PathManager');
var FieldMap            = require('../../src/NormalizedCollection/libs/FieldMap');
var Path                = require('../../src/NormalizedCollection/libs/Path');
var Filter              = require('../../src/NormalizedCollection/libs/Filter');
var hp                  = require('./helpers');
var _                   = require('lodash');

describe('RecordSet', function() {
  describe('<constructor>', function() {
    it('should inherit from AbstractRecord', function() {
      var recs = new RecordSet(makeFieldMap(makePathMgr()), new Filter());
      expect(recs).toBeInstanceOf(AbstractRecord);
    });
  });

  describe('#makeChild', function() {
    it('should return a Record', function() {
      var recs = new RecordSet(makeFieldMap(makePathMgr()), new Filter());
      var rec = recs.makeChild('r1');
      expect(rec).toBeInstanceOf(Record);
    });

    it('should have child paths with the correct record id', function() {
      var recs = new RecordSet(makeFieldMap(makePathMgr()), new Filter());
      var rec = recs.makeChild('recthingy');
      var paths = rec.getPathManager().getPaths();
      var count = 0;
      var keys = _.keys(PATHS);
      _.each(paths, function(p) {
        count++;
        expect(keys).toContain(p.name());
        if( p.name() === 'p4' ) {
          expect(p.url()).toBe(PATHS.p4.url);
        }
        else {
          expect(p.id()).toBe('recthingy');
        }
      });
      expect(count).toBe(keys.length);
    });

    it('should preserve the field map', function() {
      var recs = new RecordSet(makeFieldMap(makePathMgr()), new Filter());
      var rec = recs.makeChild('r2');
      var parentMap = recs.getFieldMap();
      var map = rec.getFieldMap();
      expect(map.length).toBe(parentMap.length);
      rec.getFieldMap().forEach(function(f, k) {
        expect(parentMap.getField(k)).not.toBeNull();
      });
    });

    it('should return the same path (not a child) for dependent paths', function() {
      var recs = new RecordSet(makeFieldMap(makePathMgr()), new Filter());
      var rec = recs.makeChild('recthingy');
      var paths = rec.getPathManager().getPaths();
      var found = 0;
      _.each(paths, function(p) {
        if( p.name() === 'p4' ) {
          found = true;
          expect(p.url()).toBe(PATHS.p4.url);
        }
      });
      expect(found).toBe(true);
    });
  });

  describe('#hasChild', function() {
    it('should return true if key exists in master snapshot', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      expect(recs.hasChild(snaps, 'r1')).toBe(true);
    });

    it('should return false if key does not exist in master snapshot', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      expect(recs.hasChild(snaps, 'notakey')).toBe(false);
    });
  });

  describe('#getChildSnaps', function() {
    it('should return an array with one child key', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var childSnaps = recs.getChildSnaps(snaps, 'r1');
      expect(childSnaps.length).toBe(1);
      expect(childSnaps[0].key()).toBe('r1');
    });

    it('should return an empty array for non-existing key', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var childSnaps = recs.getChildSnaps(snaps, 'notarealkey');
      expect(childSnaps).toBeAn('array');
      expect(childSnaps.length).toBe(0);
    });
  });

  describe('#mergeData', function() {
    it('should return correct data from snapshots', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, false);
      expect(data).toEqual(mergeSnapData(RECS));
    });

    it('should include only records that exist in the first snapshot', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, false);
      expect(_.keys(data)).toEqual(_.keys(RECS));
    });

    it('should include $key fields', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, false);
      expect(data.r1).toHaveKey('p3key');
      expect(data.r1.p3key).toBe('r1');
    });

    it('should include $value fields', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, false);
      expect(data.r1).toHaveKey('nest');
      expect(data.r1.nest).toHaveKey('p4val');
      expect(data.r1.nest.p4val).toEqual('p4r41');
    });

    it('should observe nested aliases', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, false);
      expect(data.r1).toHaveKey('nest');
      expect(data.r1.nest).toHaveKey('p4val');
      expect(data && data.r1 && data.r1.nest).toEqual({
        p4val: 'p4r41'
      });
    });

    it('should include nested priorities for isExport==true', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm, undefined, function(snap) {
        if( snap.key() === 'p4val' ) { return 99; }
        else { return null; }
      });
      var data = recs.mergeData(snaps, true);
      expect(data).toHaveKey('r1');
      expect(data && data.r1).toHaveKey('nest');
      expect(data && data.r1 && data.r1.nest).toHaveKey('p4val');
      expect(data && data.r1 && data.r1.nest && data.r1.nest.p4val).toHaveKey('.priority');
      expect(data && data.r1 && data.r1.nest && data.r1.nest.p4val).toEqual({
        '.value': 'p4r41', '.priority': 99
      });
    });

    it('should not include items filtered by where clause', function() {
      var fm = makeFieldMap(makePathMgr());
      var filter = new Filter();
      filter.add(function(data, name) {
        return name !== 'r2';
      });
      var recs = new RecordSet(fm, filter);
      var snaps = createSnaps(fm);
      var data = recs.mergeData(snaps, true);
      expect(data).toHaveKey('r1');
      expect(data).not.toHaveKey('r2');
    });
  });

  describe('#forEachKey', function() {
    it('should iterate record ids from first snapshot', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var keys = [];
      var spy = jasmine.createSpy('iterator').and.callFake(function(key, alias) {
        keys.push(alias);
        expect(RECS).toHaveKey(alias);
      });
      recs.forEachKey(snaps, spy);
      expect(spy).toHaveCallCount(_.keys(RECS).length);
    });

    it('should return the record id as the alias', function() {
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var spy = jasmine.createSpy('iterator').and.callFake(function(key, alias) {
        expect(key).toBe(alias);
      });
      recs.forEachKey(snaps, spy);
      expect(spy).toHaveBeenCalled();
    });

    it('should evaluate in the correct context', function() {
      var self = {};
      var fm = makeFieldMap(makePathMgr());
      var recs = new RecordSet(fm, new Filter());
      var snaps = createSnaps(fm);
      var spy = jasmine.createSpy('iterator').and.callFake(function(key, alias) {
        expect(this).toBe(self);
      });
      recs.forEachKey(snaps, spy, self);
      expect(spy).toHaveBeenCalled();
    });

    it('should not iterate filtered keys', function() {
      var fm = makeFieldMap(makePathMgr());
      var filter = new Filter();
      filter.add(function(data, name) {
        return name !== 'r2';
      });
      var recs = new RecordSet(fm, filter);
      var snaps = createSnaps(fm);
      var keys = _.map(RECS, function(r, k) {
        return k;
      }).reverse();
      var spy = jasmine.createSpy('iterator').and.callFake(function(key/*, alias*/) {
        expect(key).toBe(keys.pop());
      });
      recs.forEachKey(snaps, spy);
      expect(keys.length).toBe(0);
    });
  });

  describe('saveData', function() {
    it('calls remove() on all paths if given null', function() {
      var fm = makeFieldMap(makePathMgr());
      var rs = new RecordSet(fm);
      var refs = _.map(rs.getPathManager().getPaths(), function(p) {
        var ref = p.ref();
        spyOn(ref, 'remove');
        return ref;
      });
      rs.saveData(null, {isUpdate: false});
      _.each(refs, function(ref) {
        expect(ref.remove).toHaveBeenCalled();
      });
    });

    it('calls saveData() on child records', function() {
      var recIds = ['rec1', 'rec2', 'rec3'];
      var data = {};
      _.each(recIds, function(key, i) {
        data[key] = {
          foo: 'foo.value'+i,              // p1
          bar: 'bar.value'+i,              // p2
          p3val: 'p3val.value'+i,          // p3
          nest: { p4val: 'p4val.value'+i } // p4
        };
      });
      var fm = makeFieldMap(makePathMgr());
      var rs = new RecordSet(fm);
      rs.setRef(hp.stubNormRef(PATHS));
      rs.saveData(data, {isUpdate: false});
      _.each(recIds, function(key) {
        var rec = rs.child(key);
        if( rec.saveData.calls.count() !== 1 ) {
          throw new Error('Expected saveData() to have been called on ' + rec.getUrl());
        }
      });
    });
  });

  describe('#_start', function() {
    it('should invoke on() for master path');

    it('should not invoke on() for other paths');

    it('should not invoke on() twice (even for multiple events)');

    it('should invoke on() again if off() is called');
  });

  describe('#_stop', function() {
    it('should invoke off() for master path');

    it('should not call off() if on never called');
  });

  function makePathMgr() {
    return new PathManager(makePaths());
  }

  function makePaths() {
    var paths = [];
    _.each(PATHS, function(p) {
      var ref = hp.mockRef(p.url);
      var props = [ref, p.alias];
      if(p.dep) { props.push(p.dep); }
      paths.push(new Path(props));
    });
    return paths;
  }

  function makeFieldMap(mgr) {
    var map = new FieldMap(mgr);
    _.each(FIELDS, function(f) {
      map.add(makeFieldProps(f));
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

  function createSnaps(fieldMap, snapData, priFn) {
    if( snapData === undefined ) {
      snapData = _.cloneDeep(RECS);
    }
    var counter = 0;
    return _.map(snapData, function(props) {
      counter++;
      props = _.extend({ref: hp.mockRef().child('r'+counter), data: null, pri: null}, props);
      if( priFn ) { props.pri = priFn; }
      return hp.stubSnap(props.ref, props.data, props.pri);
    });
  }

  function mergeSnapData(recs) {
    var out = {};
    _.each(recs, function(v,k) {
      out[k] = _.cloneDeep(v.data || null);
    });
    return out;
  }

  var RECS = (function() {
    var fb = hp.mockRef();
    return {
      r1: {
        data: {
          s1: 'p1r1',
          foo: 'p1r1foo',
          s2: 'p2r1',
          bar: 'p2bar',
          p3key: 'r1',
          link: 'r41',
          nest: {p4val: 'p4r41'}
        },
        pri: 11
      },
      r2: {
        data: {s1: 'p1r2', p3key: 'r2', link: 'r42', nest: {p4val: 'p4r42'}},
        pri: 22
      },
      r3: {
        data: {s2: 'p2r3', p3key: 'r3'},
        pri: 33
      },
      r4: {
        data: {s1: 'p1r4', foo: 'p1r4foo', p3key: 'r4'},
        pri: 44
      },
      r5: {
        data: {p3key: 'r5', link: 'r44'},
        pri: 55
      }
    };
  })();

  var PATHS = {
    p1: {id: 'path1', alias: 'p1', url: 'Mock1://path1'},
    p2: {id: 'path2', alias: 'p2', url: 'Mock1://p2parent/path2'},
    p3: {id: null,    alias: 'p3', url: 'Mock2://'},
    p4: {id: 'path4', alias: 'p4', url: 'Mock1://path4', dep: 'p3.p4key'}
  };

  var FIELDS = [
    'p1,s,s1', 'p1,f,foo', 'p1,f99',
    'p2,s,s2', 'p2,n', 'p2,b,bar',
    'p3,$key,p3key', 'p3,p4key,link',
    'p4,$value,nest.p4val'
  ];
});
