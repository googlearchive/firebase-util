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
    var path = pathProps instanceof Path? pathProps.clone() : new Path(pathProps);
    if( !this.paths.length && path.hasDependency() ) {
      throw new Error('The master path (i.e. the first) may not declare a dependency.' +
        ' Perhaps you have put the wrong path first in the list?');
    }
    if( util.has(this.pathsByUrl, path.url()) ) {
      throw new Error('Duplicate path: ' + path.url());
    }
    if( util.contains(this.pathNames, path.name()) ) {
      throw new Error('Duplicate path name. The .key() value for each path must be unique, or you ' +
          'can give each a path an alias by using [firebaseRef, alias] in the constructor. The aliases ' +
          'must also be unique.');
    }
    this._map(path);
    this.paths.push(path);
    this.pathsByUrl[path.url()] = path.name();
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
      return p.name() === pathName;
    })||null;
  },

  getPathFor: function(url) {
    var n = this.getPathName(url);
    return n? this.getPath(n) : null;
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

  //todo remove?
  getDependencyGraph: function() {
    return util.extend(true, this.deps);
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
        map.push(p); // adds it into the error message chain
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