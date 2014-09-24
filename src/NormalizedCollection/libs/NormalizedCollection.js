'use strict';

var util        = require('../../common');
var Path        = require('./Path');
var WhereClause = require('./WhereClause');
var FieldMap    = require('./FieldMap');
var Ref         = require('./Ref');
var opList      = util.toArray(require('./constants'));

/**
 * @param {...object} path
 * @constructor
 */
function NormalizedCollection(path) { //jshint unused:vars
  this.paths = util.map(arguments, function(pathProps) {
    return new Path(pathProps);
  });
  this.map = new FieldMap(this.paths);
  this.where = new WhereClause();
}

NormalizedCollection.prototype = {
  select: function() {}, //todo

  where: function(field, op, match) {
    var args = util.args('NormalizedCollection.where', arguments, 2, 3);
    this.where.add(
      args.nextReq('string'),
      args.nextFromReq(opList),
      args.next(true)
    );
  },

  ref: function() {
    return new Ref(this);
  }
};

module.exports = NormalizedCollection;