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

  getDependencyGraph: function() {}, //todo !!!

  _map: function(path) {
    var first = this.first();
    var dep = path.getDependency();
    if( !dep && first ) {
      dep = { path: first.name(), field: '$key' };
    }
    if( dep ) {
      this.deps[dep.path] = dep.field;
    }
  }
};

module.exports = PathManager;