'use strict';

var util          = require('../../common');
var PathManager   = require('./PathManager');
var Filter        = require('./Filter');
var FieldMap      = require('./FieldMap');
var NormalizedRef = require('./NormalizedRef');
var RecordSet     = require('./RecordSet');

/**
 * @param {...object} path
 * @constructor
 */
function NormalizedCollection(path) { //jshint unused:vars
  assertPaths(arguments);
  this.pathMgr = new PathManager(arguments);
  this.map = new FieldMap();
  this.filters = new Filter();
  this.finalized = false;
}

NormalizedCollection.prototype = {
  select: function(fieldName) { //jshint unused:vars
    assertNotFinalized(this, 'select');
    var args = util.args('NormalizedCollection.select', arguments, 1);

    this.map.add(args.restAsList(0, ['string', 'object']));
  },

  filter: function(matchFn) { //jshint unused:vars
    assertNotFinalized(this, 'filter');
    var args = util.args('NormalizedCollection.filter', arguments, 1, 1);
    this.filters.add(
      args.nextReq('function')
    );
  },

  ref: function() {
    if( !this.map.length ) {
      throw new Error('Must call select() with at least one field' +
        ' before creating a ref');
    }
    this.finalized = true;
    var recordSet = new RecordSet(this.pathMgr, this.map, this.filters);
    return new NormalizedRef(recordSet);
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
      'valid Firebase reference or an Array containing a Firebase ref as the first argument');
  }
}

function assertNotFinalized(self, m) {
  if( self.finalized ) {
    throw new Error('Cannot call ' + m + '() after ref() has been invoked');
  }
}

module.exports = NormalizedCollection;