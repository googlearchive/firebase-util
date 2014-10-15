
var _ = require('lodash');
var exports = exports || {};

exports.doAfterTest = (function() {
  var subs = [];
  afterEach(function() {
    _.each(subs, function(fn) { fn(); });
    subs = [];
  });

  return function(fn, context) {
    subs.push(_.bind.apply(null, _.toArray(arguments)));
  }
})();

exports.stubPathMgr = function() {
  var paths = stubPaths(_.toArray(arguments));
  var mgr = jasmine.createSpyObj('PathManager', ['getPath', 'first', 'getPathName', 'child', 'getPaths']);
  mgr.getPath.and.callFake(function(fieldName) {
    return paths[fieldName] || null;
  });
  mgr.first.and.callFake(function() { return paths[_.keys(paths)[0]]; });
  mgr.getPathName.and.callFake(function(url) {
    var p = _.find(paths, function(p) {
      return p.url() === url;
    });
    return p? p.name() : null;
  });
  mgr.child.and.callFake(function(key) {
    return exports.stubPathMgr.apply(null, _.map(paths, function(p) { return p.child(key); }));
  });
  mgr.getPaths.and.callFake(function() {
    return _.map(paths, function(v) { return v; });
  });
  return mgr;
};

function stubPaths(pathList) {
  var paths = {};
  _.each(pathList, function(p) {
    if( typeof p === 'string' ) {
      var parts = p.split('.');
      var alias = parts[1]||parts[0];
      paths[alias] = exports.stubPath(parts[0], alias);
    }
    else {
      paths[p.name()] = p;
    }
  });
  return paths;
}

exports.stubPath = function(path, alias, url) {
  if( !path ) { path = 'path1'; }
  if( !alias ) { alias = path; }
  var p = jasmine.createSpyObj('Path', ['name', 'id', 'url', 'child']);
  p.name.and.callFake(function() { return alias; });
  p.id.and.callFake(function() { return path; });
  p.url.and.callFake(function() { return (url? url + '/' : 'Mock://') + path; });
  p.child.and.callFake(function(key) { return exports.stubPath(key, key, p.url()); });
  return p;
};

exports.stubSnap = function(ref, data, pri) {
  if( arguments.length === 0 ) { ref = exports.stubRef(/* root */); }
  if( arguments.length < 2 || _.isUndefined(data) ) { data = null; }
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
      return exports.stubSnap(ref.child(key), _.has(data, key)? data[key] : null, typeof pri === 'function'? pri : null);
    }
  );
  obj.val.and.callFake(
    function() { return _.cloneDeep(data) }
  );
  obj.hasChild.and.callFake(
    function(key) { return _.has(data, key); }
  );
  obj.forEach.and.callFake(
    function(callback, context) {
      var res = false;
      _.each(data, function(v,k) {
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
      if( _.isObject(data) ) {
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
};

exports.stubRef = function(pathName, rec, url) {
  if( !rec ) {
    rec = exports.stubRec();
  }
  if( arguments.length === 0 ) { pathName = null; } // root
  var obj = jasmine.createSpyObj('ref', ['name', 'child', 'ref', 'toString', '_getRec']);
  obj.child.and.callFake(function(key) {
    return exports.stubRef(key, rec.child(key), obj.toString());
  });
  obj.ref.and.callFake(function() { return obj; });
  obj.name.and.callFake(function() { return pathName; });
  obj.toString.and.callFake(function() {
    return (url? url + '/' : 'Mock://') + pathName;
  });
  obj._getRec.and.callFake(function() { return rec; });
  return obj;
};

exports.stubFieldMap = function(fields) {
  var map = jasmine.createSpyObj('FieldMapStub', ['extractData', 'aliasFor', 'fieldsFor', 'pathFor', 'get', 'add']);
  map.fieldsByKey = {};
  map.fieldsByAlias = {};
  _.each(fields||['path1.field1.foo'], function(f) {
    var parts = (typeof f === 'string'? f : f.key).split('.');
    if( parts.length < 2 ) { parts.unshift('path1'); }
    if( typeof f === 'string' ) {
      f = {};
    }
    f.key = f.key || parts[0]+'.'+parts[1];
    f.id = parts[1];
    f.alias = f.alias || parts[2] || f.id;
    f.path = exports.stubPath(parts[0]);
    f.url = f.path.url() + '/' + f.id;
    map.fieldsByKey[f.id] = f;
    map.fieldsByAlias[f.alias] = f;
  });
  map.get.and.callFake(function(fieldName) {
    return map.fieldsByAlias[fieldName]||null;
  });
  map.key = function(path, field) { return path + '.' + field; };
  map.aliasFor.and.callFake(function(url) {
    return _.find(map.fieldsByKey, function(f) {
      return f.url === url;
    }) || null;
  });
  return map;
};

exports.stubRec = function(fields) {
  var fieldMap = exports.stubFieldMap(fields);
  var rec = jasmine.createSpyObj('RecordStub',
    ['getPathMgr', 'mergeData', 'child', 'getChildSnaps', 'hasChild', 'forEach', 'getFieldMap']
  );
  var mgr = exports.stubPathMgr('path1');
  rec.getPathMgr.and.callFake(function() {
    return mgr;
  });
  rec.child.and.callFake(function(key) {
    return exports.stubRec([key]);
  });
  rec.mergeData.and.callFake(function(snaps, isExport) {
    var dat = exports.deepExtend.apply(null, _.map(snaps, function(snap) {
      return isExport? snap.exportVal() : snap.val();
    }));
    return _.isObject(dat) && _.isEmpty(dat)? null : dat;
  });
  rec.getChildSnaps.and.callFake(function(snaps, key) {
    return _.map(snaps, function(ss) {
      return ss.child(key);
    });
  });
  rec.hasChild.and.callFake(function(url) {
    return fieldMap.aliasFor(url) !== null;
  });
  rec.forEach.and.callFake(function(snaps, iterator, context) {
    var res = false;
    _.each(fieldMap.fieldsByKey, function(f) {
      var key = f.id;
      var snap = _.find(snaps, function(snap) { return snap.hasChild(key); });
      if( snap ) {
        res = iterator.call(context, snap.child(key)) === true;
        return !res;
      }
    });
    return res;
  });
  rec.getFieldMap.and.callFake(function() { return fieldMap; });
  return rec;
};

exports.deepExtend = function() {
  var args = _.toArray(arguments);
  var base = args.shift();
  if( args.length === 0 ) { return base; }
  if( !_.isObject(base) ) { return _.cloneDeep(args.pop()); }
  _.each(args, function(obj) {
    _.each(obj, function(v,k) {
      base[k] = exports.deepExtend(base[k], v);
    });
  });
  return base;
};

beforeEach(function() {
  this.helpers = exports;
});