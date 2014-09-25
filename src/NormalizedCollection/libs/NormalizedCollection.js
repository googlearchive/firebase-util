'use strict';

var util        = require('../../common');
var PathManager = require('./PathManager');
var WhereClause = require('./WhereClause');
var FieldMap    = require('./FieldMap');
var Ref         = require('./Ref');
var RecordSet   = require('./RecordSet');
var opList      = util.toArray(require('./constants'));

/**
 * @param {...object} path
 * @constructor
 */
function NormalizedCollection(path) { //jshint unused:vars
  if( arguments.length < 1 ) {
    throw new Error('Must provide at least one path definition');
  }
  this.pathMgr = new PathManager(arguments);
  this.map = new FieldMap();
  this.filters = new WhereClause();
}

NormalizedCollection.prototype = {
  select: function(props) {
    var args = util.args('NormalizedCollection.select', arguments, 1);
    this.map.add(args.restAsList(1, ['string', 'object']));
  },

  where: function(field, op, match) {
    var args = util.args('NormalizedCollection.where', arguments, 2, 3);
    this.filters.add(
      args.nextReq('string'),
      args.nextFromReq(opList),
      args.next(true)
    );
  },

  ref: function() {
    if( !this.map.length ) {
      throw new Error('Must specify at least one field using select() before creating a ref');
    }
    var recordSet = new RecordSet(this.pathMgr, this.map, this.filters);
    return new Ref(recordSet);
  }
};

module.exports = NormalizedCollection;