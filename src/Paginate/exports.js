'use strict';
var util = require('../common');
var Scroll = require('./libs/Scroll.js');
var Paginate = require('./libs/Paginate.js');
var ReadOnlyRef = require('./libs/ReadOnlyRef.js');

var DEFAULTS = {
  field: null,
  pageSize: 10,
  maxCache: 500,
  windowSize: 250
};

exports.Scroll = function(baseRef, sortField, opts) {
  if( !util.isFirebaseRef(baseRef) ) {
    throw new Error('First argument to Firebase.util.Scroll must be a valid Firebase ref');
  }
  if( typeof sortField !== 'string' ) {
    throw new Error('Second argument to Firebase.util.Scroll must be a valid string');
  }
  if( arguments.length > 2 && !util.isObject(opts) ) {
    throw new Error('Optional third argument to Firebase.util.Scroll must be an object of key/value pairs');
  }
  var ref = new ReadOnlyRef(baseRef);
  ref.scroll = new Scroll(ref, sortField, util.extend({}, DEFAULTS, opts));
  return ref;
};

exports.Paginate = function(baseRef, sortField, opts) {
  if( !util.isFirebaseRef(baseRef) ) {
    throw new Error('First argument to Firebase.util.Paginate must be a valid Firebase ref');
  }
  if( typeof sortField !== 'string' ) {
    throw new Error('Second argument to Firebase.util.Paginate must be a valid string');
  }
  if( arguments.length > 2 && !util.isObject(opts) ) {
    throw new Error('Optional third argument to Firebase.util.Paginate must be an object of key/value pairs');
  }
  var ref = new ReadOnlyRef(baseRef);
  ref.page = new Paginate(ref, sortField, util.extend({}, DEFAULTS, opts));
  return ref;
};