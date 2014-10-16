'use strict';

var Path = require('./Path');
var util = require('../../common');

function PathManager(paths) {
  this.paths = [];
  this.pathsByUrl = {};
  this.deps = {};
  this.pathNames = [];
  util.each(paths, this.add, this);
}

PathManager.prototype = {
  add: function(pathProps) {
    var path = pathProps instanceof Path? pathProps : new Path(pathProps);
    if( !this.paths.length && path.hasDependency() ) {
      throw new Error('The master path (i.e. the first) may not declare a dependency.' +
        ' Perhaps you have put the wrong path first in the list?');
    }
    if( util.has(this.pathsByUrl, path.url()) ) {
      throw new Error('Duplicate path: ' + path.url());
    }
    this._map(path);
    this.paths.push(path);
    this.pathsByUrl[path.url()] = path.id();
    this.pathNames.push(path.name());
  },

  count: function() {
    return this.paths.length;
  },

  first: function() {
    return this.paths[0];
  },

  getPath: function(pathName) {
    return util.find(this.paths, function(p) {
      return p.alias === pathName;
    });
  },

  getPaths: function() {
    return this.paths.slice();
  },

  getPathName: function(url) {
    return this.pathsByUrl[url] || null;
  },

  getPathNames: function() {
    return this.pathNames.slice();
  },

  getDependencyGraph: function() {
    var out = { names: [], deps: {} };
    util.each(this.paths, function(p) {
      out.names.push(p.name());
      out.deps[p.name()] = [];
    });
    util.each(this.deps, function(dep, pathName) {
      out.deps[dep.path].push(pathName);
    });
    return out;
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