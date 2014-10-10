
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
  var mgr = jasmine.createSpyObj('PathManager', ['getPath', 'first', 'getPathName', 'child']);
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
  return mgr;
};

function stubPaths(pathList) {
  var paths = {};
  _.each(pathList, function(p) {
    var parts = p.split('.');
    var alias = parts[1]||parts[0];
    paths[alias] = exports.stubPath(parts[0], alias);
  });
  return paths;
};

exports.stubPath = function(path, alias, url) {
  var p = jasmine.createSpyObj('Path', ['name', 'id', 'url', 'child']);
  p.name.and.callFake(function() { return alias; });
  p.id.and.callFake(function() { return path; });
  p.url.and.callFake(function() { return (url? url + '/' : 'Mock://') + path; });
  p.child.and.callFake(function(key) { return exports.stubPath(key, key, p.url()); });
  return p;
};

exports.stubSnap = function(ref, data, pri) {
  if( arguments.length === 0 ) { ref = exports.stubRef(/* root */); }
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
      return exports.stubSnap(ref.child(key), _.has(data, key)? data[key] : null, typeof pri === 'function'? pri : null);
    }
  );
  obj.val.and.callFake(
    function() { return data }
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

exports.stubRef = function(pathName) {
  if( arguments.length === 0 ) { pathName = null; } // root
  var obj = jasmine.createSpyObj('ref', ['name', 'child', 'ref', 'toString']);
  obj.child.and.callFake(function(key) { return exports.stubRef(key); });
  obj.ref.and.callFake(function() { return obj; });
  obj.name.and.callFake(function() { return pathName; });
  obj.toString.and.callFake(function() { return 'Mock://' + pathName; });
  return obj;
};

beforeEach(function() {
  this.helpers = exports;
});