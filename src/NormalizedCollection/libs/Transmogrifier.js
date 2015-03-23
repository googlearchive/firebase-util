'use strict';

var util        = require('../../common');
var PathManager = require('./PathManager');
var Path        = require('./Path');
var FieldMap    = require('./FieldMap');
var RecordSet   = require('./RecordSet');

module.exports = {
  replicate: function(record, newMasterRef) {
    // create a new set of paths
    var paths = record.getPathManager().getPaths().slice(0);
    var firstPath = paths[0];
    paths[0] = new Path([newMasterRef, firstPath.name(), firstPath.getDependency()]);
    var mgr = new PathManager(util.map(paths, function(p) { return p.clone(); }));

    // create a new field map from the updated paths
    var fieldMap = new FieldMap(mgr);
    record.getFieldMap().forEach(fieldMap.add, fieldMap);

    // recreate the AbstractRecord instance
    var Clazz = record.getClass();
    var rec;
    if( Clazz === RecordSet ) {
      rec = new Clazz(fieldMap, record.filters);
    }
    else {
      rec = new Clazz(fieldMap);
    }

    // done!
    return rec;
  }
};