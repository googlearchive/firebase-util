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
  assertPaths(arguments);
  this.pathMgr = new PathManager(arguments);
  this.map = new FieldMap();
  this.filters = new WhereClause();
}

NormalizedCollection.prototype = {
  select: function(props) { //jshint unused:vars
    var args = util.args('NormalizedCollection.select', arguments, 1);
    this.map.add(args.restAsList(1, ['string', 'object']));
  },

  where: function(field, op, match) { //jshint unused:vars
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

function assertPaths(args) {
  if( args.length < 1 ) {
    throw new Error('Must provide at least one path definition');
  }
  function notValidRef(p) {
    if( util.isArray(p) ) {
      p = p[0];
    }
    return !util.isFirebaseRef(p);
  }
  if( util.contains(args, notValidRef) ) {
    throw new Error('Each argument to the NormalizedCollection constructor must be a ' +
      'valid Firebase reference or an Array');
  }
}

module.exports = NormalizedCollection;