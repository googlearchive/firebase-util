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
  this.map = new FieldMap(this.pathMgr);
  this.filters = new Filter();
  this.finalized = false;
}

NormalizedCollection.prototype = {
  select: function(fieldName) { //jshint unused:vars
    assertNotFinalized(this, 'select');
    var args = util.args('NormalizedCollection.select', arguments, 1);
    util.each(args.restAsList(0, ['string', 'object']), function(f) {
      assertValidField(f);
      this.map.add(f);
    }, this);
    return this;
  },

  filter: function(matchFn) { //jshint unused:vars
    assertNotFinalized(this, 'filter');
    var args = util.args('NormalizedCollection.filter', arguments, 1, 1);
    this.filters.add(
      args.nextReq('function')
    );
    return this;
  },

  ref: function() {
    if( !this.map.length ) {
      throw new Error('Must call select() with at least one field' +
        ' before creating a ref');
    }
    this.finalized = true;
    if( util.log.isInfoEnabled() ) {
      util.log.info('NormalizedRef created using %s', buildDebugString(this));
    }
    var recordSet = new RecordSet(this.map, this.filters);
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

function buildDebugString(nc) {
  var paths = [];
  var selects = [];
  var filter = '';

  util.each(nc.pathMgr.getPaths(), function(p) {
    var dep = p.getDependency();
    paths.push(
      util.printf('\t"%s%s"%s',
        p.url(),
        p.id() === p.name()? '' : ' as ' + p.name(),
        dep? '-> ' + dep.path + '.' + dep.field : ''
      )
    );
  });

  nc.map.forEach(function(f) {
    selects.push(util.printf('"%s%s"', f.key, f.alias === f.id? '' : ' as ' + f.alias));
    if( selects.length % 5 === 0 ) {
      selects.push('\n');
    }
  });

  if(nc.filters.criteria.length > 0) {
    filter = util.printf('<%s filters applied>', nc.filters.criteria.length);
  }

  return util.printf('NormalizedCollection(\n%s\n).select(%s)%s.ref()', paths.join('\n'), selects.join(', '), filter);
}

function assertValidField(f) {
  var k;
  if( typeof f === 'string' ) {
    k = f;
  }
  else {
    k = util.has(f, 'key')? f.key : util.undef;
  }
  if( typeof f !== 'string' || !f.indexOf('.') > 0 ) {
    throw new Error('Each field passed to NormalizedCollection.select() must either be a string ' +
    'in the format "pathAlias.fieldId", or an object in the format ' +
    '{key: "pathAlias.fieldId", alias: "any_name_for_field"}, but I received ' + JSON.stringify(f));
  }
}

module.exports = NormalizedCollection;