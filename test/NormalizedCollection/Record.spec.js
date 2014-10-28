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
var RECID               = 'foobar123';

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

  describe('#getChildSnaps', function() {
    it('should return one snapshot', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = createSnaps({f11: 'foo'}, {f99: 'bar'}, true, false);
      expect(rec.getChildSnaps(snaps, 'foo').length).toBe(1);
    });

    it('should be the snapshot for the correct child key', function() {
      var rec = new Record(makeFieldMap(makePathMgr()));
      var snaps = rec.getChildSnaps(createSnaps({f11: 'fooval'}, {f99: 'barval'}, true, false), 'foo');
      expect(snaps[0].name()).toBe('f11');
      expect(snaps[0].val()).toBe('fooval');
    });
  });

  describe('#mergeData', function() {
    it('should contain intersection of all snaps and fields'/*, function() {
      var mgr = makePathMgr();
    }*/);

    it('should include $value');

    it('should include $key');

    it('should include dynamic fields');
  });

  describe('#forEachKey', function() {
    it('should iterate only the intersection of fields and snapshots');

    it('should include $key fields if path exists in snapshots');

    it('should not include $key fields if path does not exist in snapshots');

    it('should include $value fields if snapshot value is not null');

    it('should not include $value field if snapshot value is null');

    it('should not include $value field if snapshot does not exist');

    it('should do something with dynamic paths?');
  });

  describe('#_start', function() {
    it('should invoke on() for all refs/paths');
  });

  describe('#_stop', function() {
    it('should invoke off() for all refs/paths');
  });

  function makePathMgr() {
    return new PathManager(makePaths());
  }

  function makePaths() {
    var paths = [];
    _.each(PATHS, function(p) {
      var ref = hp.mockRef(p.url);
      var path = new Path([ref, p.alias]).normChild(RECID);
      paths.push(path);
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

  function createSnaps() {
    var snaps = [];
    var keys = _.keys(PATHS).reverse();
    _.each(arguments, function(dat) {
      var pathKey = keys.pop();
      snaps.push(hp.stubSnap(hp.mockRef(PATHS[pathKey].url).child(RECID), dat));
    });
    return snaps;
  }

  var PATHS = {
    p1: {id: 'path1', alias: 'p1', url: 'Mock1://path1'},
    p2: {id: 'path2', alias: 'p2', url: 'Mock1://p2parent/path2'},
    p3: {id: null,    alias: 'p3', url: 'Mock2://'},
    p4: {id: 'path4', alias: 'p4', url: 'Mock1://path4', dep: 'p3.$value'}
  };

  var FIELDS = [
    'p1,f10', 'p1,f11,foo', 'p1,f99',
    'p2,f20', 'p2,f99,bar',
    'p3,$key,p3key', 'p3,$value,p3val',
    'p4,$value,nest.p4val'
  ];

});