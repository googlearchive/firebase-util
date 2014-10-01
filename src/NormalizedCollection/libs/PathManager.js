'use strict';

var Path = require('./Path');
var util = require('../../common');

function PathManager(fieldMap, paths) {
  this.fields = fieldMap;
  this.paths = [];
  this.deps = {};
  util.each(paths, this.add, this);
}

PathManager.prototype = {
  add: function(pathProps) {
    var path = pathProps instanceof Path? pathProps : new Path(pathProps);
    if( !this.paths.length && path.hasDependency() ) {
      throw new Error('The master path (i.e. the first) may not declare a dependency.' +
        ' Perhaps you have put the wrong path first in the list?');
    }
    this._map(path);
    this.paths.push(path);
  },

  first: function() {
    return this.paths[0];
  },

  getPath: function(pathName) {
    return util.find(this.paths, function(p) {
      return p.alias === pathName;
    });
  },

  child: function(key) {
    var pm = new PathManager();
    pm.isChild = true;
    util.each(this.paths, function(p) {
      pm.add(p.child(key));
    });
    return pm;
  },

  getDependencyGraph: function() {
    var deps = { order: [], paths: {} };
    util.each(this.paths, function(p) {
      deps.paths[p.name()] = [];
    });
    util.each(this.deps, function(dep, pathName) {
      dep.paths[dep.path].push(pathName);
    });
  },

  _map: function(path) {
    var first = this.first();
    var dep = path.getDependency();
    if( !dep && first ) {
      dep = { path: first.name(), field: '$key' };
    }
    if( dep ) {
      this.deps[path.name()] = dep;
      this._assertNotCircularDep(path.name());
    }
  },

  _assertNotCircularDep: function(pathName) {
    var map = [pathName], dep = this.deps[pathName];
    while(util.isDefined(dep)) {
      var p = dep.path;
      if(util.contains(map, p)) {
        map.push(p);
        throw new Error('Circular dependencies in paths: ' + depChain(map, this.deps));
      }
      map.push(p);
      dep = util.val(this.deps, p);
    }
  }
};

function depChain(map, deps) {
  return util.map(map, function(p) {
    return deps[p].path + '.' + deps[p].field;
  }).join(' >> ');
}

module.exports = PathManager;