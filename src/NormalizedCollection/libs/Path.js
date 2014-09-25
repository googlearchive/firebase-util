'use strict';

var Query = require('./Query');

function Path(pathProps) {
  var props = parseProps(pathProps);
  this._ref = props.ref;
  this._alias = props.alias;
  this._dep = props.dep;
}

Path.prototype = {
  ref: function() { return this._ref; },
  reff: function() { return this.ref().ref(); },
  child: function(key) {
    return new Path(this.reff().child(key));
  },
  hasDependency: function() {
    return this._dep !== null;
  },
  getDependency: function() {
    return this._dep;
  },
  name: function() { return this._alias; },
  id: function() { return this.reff().name(); }
};

function parseProps(props) {
  var ref, alias, dep = null;
  if( util.isArray(props) ) {
    ref = props[0];
    alias = props[1];
    dep = props[2];
  }
  else {
    ref = props;
  }
  return {
    ref: ref, alias: alias||ref.name(), dep: parseDep(dep)
  }
}

function parseDep(dep) {
  if( dep ) {
    var parts = dep.split('.');
    return { path: parts[0], field: parts[1] };
  }
  return null;
}

module.exports = Path;