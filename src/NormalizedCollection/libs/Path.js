'use strict';

function Path(pathProps) {
  //todo
}

Path.prototype = {
  //todo
  ref: function() {},
  reff: function() { return this.ref().ref(); },
  child: function(key) {
    return new Path(this.reff().child(key));
  },
  hasDependency: function() {},
  getDependency: function() {},
  name: function() { return this._alias; },
  id: function() { return this.reff().name(); }
};

module.exports = Path;