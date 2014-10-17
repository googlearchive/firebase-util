
var _ = require('lodash');
//var MockFirebase = require('mockfirebase');

var exports = exports || {};

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

/**
 * Creates a PathManager stub.
 *
 * @param {Array} [pathList] see PATHS above for example and defaults
 * @returns {object}
 */
exports.stubPathMgr = function(pathList) {
  var paths = exports.stubPaths(pathList);
  var mgr = jasmine.createSpyObj('PathManagerStub', ['getPath', 'first', 'getPathName', 'getPaths', 'getPathNames']);
  mgr.getPath.and.callFake(function(fieldName) {
    return paths[fieldName] || null;
  });
  mgr.first.and.callFake(function() { return firstChild(paths); });
  mgr.getPathName.and.callFake(function(url) {
    var p = _.find(paths, function(p) {
      return p.url() === url;
    });
    return p? p.name() : null;
  });
  mgr.getPaths.and.callFake(function() {
    return _.map(paths, function(v) { return v; });
  });
  mgr.getPathNames.and.callFake(function() {
    return _.keys(paths);
  });
  return mgr;
};

/**
 * Creates an array of Path stubs.
 *
 * @param {Array|Object} [paths] see PATHS above for example and defaults
 * @returns {object}
 */
exports.stubPaths = function(paths) {
  var out = {};
  _.each(paths||PATHS, function(p) {
    var path = _.isObject(p) && typeof(p.reff) === 'function'? p : exports.stubPath(p);
    out[path.name()] = path;
  });
  return out;
};

/**
 * Creates a Path stub.
 *
 * @param {object|string} props see PATHS above for examples and valid strings
 * @returns {object}
 */
exports.stubPath = function(props) {
  if( typeof props === 'string' ) {
    props = PATHS[props];
  }
  var p = jasmine.createSpyObj('PathStub', ['name', 'id', 'url', 'child', 'ref', 'reff', 'hasDependency', 'getDependency']);
  p.name.and.callFake(function() { return props.alias || null; });
  p.id.and.callFake(function() { return props.id || null; });
  p.url.and.callFake(function() { return props.url; });
  p.child.and.callFake(function(key) {
    return denestChildKey(p, key, function(base, k) {
      return exports.stubPath({id: k, alias: k, url: base.url() + '/' + k});
    });
  });
  p.ref.and.callFake(function() { return exports.stubFbRef(p); });
  p.reff.and.callFake(function() { return exports.stubFbRef(p); });
  p.hasDependency.and.callFake(function() {
    return _.has(props, 'dep');
  });
  p.getDependency.and.callFake(function() {
    return props.dep || null;
  });
  return p;
};

/**
 * Creates a Snapshot stub
 *
 * @param {object} [ref] a Ref stub (defaults to root Ref)
 * @param [data] any data to be returned by the snapshot (defaults to null)
 * @param [pri] any priority to be return (defaults to null)
 * @returns {*}
 */
exports.stubSnap = function(ref, data, pri) {
  if( arguments.length === 0 ) { ref = exports.stubRef(); }
  if( arguments.length < 2 || _.isUndefined(data) ) { data = null; }
  if( arguments.length < 3 ) { pri = null; }
  var obj = jasmine.createSpyObj('SnapshotStub',
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
      return denestChildKey(obj, key, function(parent, k) {
        var cdata = parent.$$rawData();
        var pri = parent.getPriority();
        return exports.stubSnap(
          parent.ref().child(k),
          _.has(cdata, k)? cdata[k] : null,
          typeof pri === 'function'? pri : null
        );
      });
    }
  );
  obj.$$rawData = function() { return data; };
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

/**
 * Simulates a Ref instance.
 *
 * @param {Array} [pathList] see PATHS above for example and defaults
 * @returns {object}
 */
exports.stubRef = function(pathList, fieldList) {
  var paths = exports.stubPaths(pathList);
  var rec = exports.stubRec(paths, fieldList);
  var obj = jasmine.createSpyObj('RefStub', ['name', 'child', 'ref', 'toString', '_getRec']);
  obj.child.and.callFake(function(key) {
    var lastKey = obj.$$firstPath().name();
    return denestChildKey(obj, key, function(nextParent, nextKey) {
      return exports.stubRef(
        [nextParent.$$firstPath().child(nextKey)],
        [lastKey + ',' + nextKey]
      );
      lastKey = nextKey;
    });
  });
  obj.ref.and.callFake(function() { return obj; });
  obj.name.and.callFake(function() { return pathName(paths); });
  obj.toString.and.callFake(function() { return pathString(paths); });
  obj._getRec.and.callFake(function() { return rec; });
  obj.$$firstPath = function() { return firstChild(paths); };
  return obj;
};

/**
 * Generates a FieldMap stub.
 *
 * @param {Array} [optionalFields] defaults to FIELDS above
 * @returns {*}
 */
exports.stubFieldMap = function(optionalFields) {
  var map = jasmine.createSpyObj('FieldMapStub', ['extractData', 'aliasFor', 'fieldsFor', 'pathFor', 'get', 'add']);
  map.fieldsByKey = {};
  map.fieldsByAlias = {};
  _.each(optionalFields || FIELDS, function(f) {
    var parts = f.split(',');
    var field = {};
    field.pathName = parts[0];
    field.id = parts[1];
    field.alias = parts[2] || parts[1];
    field.key = field.path + '.' + field.id;
    field.path = exports.stubPath(PATHS[field.pathName]);
    field.url = field.path.url() + '/' + field.id;
    map.fieldsByKey[field.id] = field;
    map.fieldsByAlias[field.alias] = field;
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

/**
 * Creates a Rec stub.
 * @param {Array} [pathList] defaults to PATHS above
 * @param {Array|object} [fieldList] defaults to FIELDS above
 * @returns {*}
 */
exports.stubRec = function(pathList, fieldList) {
  var paths = exports.stubPaths(pathList);
  var fieldMap = exports.stubFieldMap(fieldList);
  var rec = jasmine.createSpyObj('RecordStub',
    ['getPathMgr', 'mergeData', 'child', 'getChildSnaps', 'hasChild', 'forEachKey', 'getFieldMap']
  );
  var mgr = exports.stubPathMgr();
  rec.getPathMgr.and.callFake(function() {
    return mgr;
  });
  rec.child.and.callFake(function(key) {
    return denestChildKey(rec, key, function(nextParent, nextKey) {
      var p = firstChild(nextParent.$$getPaths()).child(nextKey);
      return exports.stubRec([p], [p.name() + '.' + nextKey]);
    });
  });
  rec.$$getPaths = function() { return paths; };
  rec.mergeData.and.callFake(function(snaps, isExport) {
    var dat = exports.deepExtend.apply(null, _.map(snaps, function(snap) {
      return isExport? snap.exportVal() : snap.val();
    }));
    return _.isObject(dat) && _.isEmpty(dat)? null : dat;
  });
  rec.getChildSnaps.and.callFake(function(snaps, fieldName) {
    var f = fieldMap.get(fieldName);
    var key = f? f.id : fieldName;
    return [(_.find(snaps, function(ss) {
      return !f || f.url === ss.ref().toString();
    })||snaps[0]).child(key)];
  });
  rec.hasChild.and.callFake(function(url) {
    return fieldMap.aliasFor(url) !== null;
  });
  rec.forEachKey.and.callFake(function(snaps, iterator, context) {
    var res = false;
    _.each(fieldMap.fieldsByKey, function(f) {
      var snap, key = f.id;
      switch(key) {
        case '$key':
        case '$value':
          // do nothing; we don't include the $keys or $values in forEach
          // because there is no appropriate snapshot or ref for them
          break;
        default:
          snap = _.find(snaps, function(snap) {
            return snap.hasChild(key) && snap.ref().toString() === f.path.url();
          });
      }
      if( snap ) {
        res = iterator.call(context, f.alias) === true;
        return !res; // _.each takes false to abort, our forEach methods take true
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

exports.snaps = function() {
  var i = 0;
  return _.map(_.flatten(arguments), function(snapData) {
    i++;
    return exports.stubFbSnap(
      exports.stubFbRef(exports.stubPath('p' + i)),
      snapData,
      i
    );
  });
};

exports.stubFbRef = function(path) {
  var obj = jasmine.createSpyObj('ref', ['name', 'child', 'ref', 'toString']);
  obj.child.and.callFake(function(key) {
    return denestChildKey(obj, key, function(nextParent, nextKey) {
      return exports.stubFbRef(nextParent.$$getPath().child(nextKey));
    });
  });
  obj.ref.and.callFake(function() { return obj; });
  obj.name.and.callFake(function() { return path.id(); });
  obj.toString.and.callFake(function() { return path.url(); });
  obj.$$getPath = function() { return path; };
  return obj;
};

/**
 * Creates a stub for a Firebase snapshot (not a NormalizedCollection/Snapshot object)
 *
 * @param {object} fbRef
 * @param {*} [data]
 * @param {number|string|function} [pri]
 * @returns {*}
 */
exports.stubFbSnap = function(fbRef, data, pri) {
  if( arguments.length < 2 || _.isUndefined(data) ) { data = null; }
  if( arguments.length < 3 ) { pri = null; }
  var obj = jasmine.createSpyObj('snapshot',
    ['name', 'ref', 'val', 'forEach', 'child', 'hasChild', 'hasChildren', 'numChildren', 'getPriority', 'exportVal']
  );
  obj.name.and.callFake(
    function() { return fbRef.name(); }
  );
  obj.ref.and.callFake(
    function() { return fbRef; }
  );
  obj.child.and.callFake(
    function(key) {
      return denestChildKey(obj, key, function(nextParent, nextKey) {
        var cdata = nextParent.val();
        return exports.stubFbSnap(
          nextParent.ref().child(nextKey),
          _.has(cdata, nextKey)? cdata[nextKey] : null,
            typeof pri === 'function'? pri : null
        );
      });
    }
  );
  obj.val.and.callFake(
    function() { return _.cloneDeep(data) }
  );
  obj.hasChild.and.callFake(
    function(key) { return _.has(data, key); }
  );
  obj.hasChildren.and.callFake(
    function() { return _.isObject(data) && !_.isEmpty(data); }
  );
  obj.numChildren.and.callFake(
    function() { return _.size(data); }
  );
  obj.forEach.and.callFake(
    function(callback, context) {
      var res = false;
      _.each(data, function(v,k) {
        if( res !== true ) {
          res = callback.call(context, obj.child(k));
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
      var pri = obj.getPriority(), out = null;
      console.log('exportVal', obj.name(), pri, data); //debug
      if( _.isObject(data) ) {
        out = {};
        if( pri !== null ) { out['.priority'] = pri; }
        obj.forEach(function(ss) {
          out[ss.name()] = ss.exportVal();
        });
      }
      else if( pri !== null ) {
        out = { '.value': data, '.priority': pri };
      }
      else {
        out = data;
      }
      console.log('exportVal!', out); //debug
      return out;
    }
  );
  return obj;
};

function pathString(paths) {
  switch(_.size(paths)) {
    case 0: return null;
    case 1: return firstChild(paths).url();
    default: return '[' + _.map(paths, function(p) { return p.url(); }).join('][') + ']';
  }
}

function pathName(paths) {
  switch(_.size(paths)) {
    case 0: return null;
    case 1: return firstChild(paths).name();
    default: return '[' + _.map(paths, function(p) { return p.name(); }).join('][') + ']';
  }
}

function firstChild(collection) {
  var x = _.isArray(collection)? 0 : _.keys(collection)[0];
  return collection[x];
}

function denestChildKey(base, childKey, iterator) {
  var child = base;
  var parts = childKey.split('/').reverse();
  while(parts.length) {
    var k = parts.pop();
    child = iterator(child, k);
  }
  return child;
}

return exports;