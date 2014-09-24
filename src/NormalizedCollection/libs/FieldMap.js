'use strict';

function FieldMap() {
  this.fields = {};
}

FieldMap.prototype = {
  add: function(fieldProps) {
    var f = new Field(fieldProps);
    this.fields[f.id] = f;
  },
  'get': function(fieldKey) {
    return this.fields[fieldKey]||null;
  },
  map: function() {
    //todo
  }
};

function Field(props) {
  this.props = props;
}

Field.prototype = {
  hasDependency: function() {
    return this.getDependency() !== null;
  },

  getDependency: function() {
    //todo
  }
};

module.exports = FieldMap;