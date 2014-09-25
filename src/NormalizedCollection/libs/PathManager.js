'use strict';

var Path = require('./Path');
var util = require('../../common');

function PathManager(fieldMap, paths) {
  this.fields = fieldMap;
  this.paths = [];
  util.each(paths, function(pathProps) {
    this.add(new Path(pathProps));
  }, this);
}

PathManager.prototype = {
  add: function(path) {
    this.paths.push(path);
    //todo map dependencies
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

  getDependencyMap: function() {
    //todo
  }
};

module.exports = PathManager;