'use strict';

var util = require('../../common');

function Path(pathProps, parent) {
  var props = parseProps(pathProps);
  this._ref = props.ref;
  this._alias = props.alias;
  this._dep = props.dep;
  this._parent = parent || null;
}

Path.prototype = {
  ref: function() { return this._ref; },
  reff: function() { return this.ref().ref(); },
  child: function(key) {
    return new Path(this.reff().child(key), this);
  },
  normChild: function(key) {
    var dep = this.getDependency();
    if( dep !== null ) {
      return new Path([this.reff(), this.name(), dep.path+'.'+dep.field], this);
    }
    else {
      return new Path([this.reff().child(key), this.name()], this);
    }
  },
  hasDependency: function() {
    return this._dep !== null;
  },
  getDependency: function() {
    return this._dep;
  },
  url: function() { return this.reff().toString(); },
  name: function() { return this._alias; },
  id: function() { return this.reff().key(); },
  parent: function() { return this._parent; },
  clone: function() {
    return new Path([this._ref, this._alias, this._dep], this._parent);
  }
};

function parseProps(props) {
  var ref, alias, dep = null;
  if( util.isArray(props) ) {
    ref = props[0];
    alias = props[1];
    dep = props[2];
  }
  else if( util.isFunction(props.ref) ) {
    ref = props.ref();
  }
  else {
    ref = props;
  }
  return {
    ref: ref, alias: alias||ref.key(), dep: parseDep(dep)
  };
}

function parseDep(dep) {
  if(util.isObject(dep) ) {
    return dep;
  }
  else if( dep ) {
    var parts = dep.split('.');
    return { path: parts[0], field: parts[1] };
  }
  return null;
}

module.exports = Path;