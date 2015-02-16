'use strict';
var util = require('../common');
var Scroll = require('./libs/Scroll.js');
var Paginate = require('./libs/Paginate.js');
var ReadOnlyRef = require('./libs/ReadOnlyRef.js');

var DEFAULTS = {
  field: null,
  pageSize: 10,
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
  ref.scroll = new Scroll(ref, sortField, calcOpts(opts, 'windowSize', 'Scroll'));
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
  ref.page = new Paginate(ref, sortField, calcOpts(opts, 'pageSize', 'Paginate'));
  return ref;
};

function calcOpts(opts, maxFromKey, method) {
  var res = util.extend({}, DEFAULTS, opts);
  if( !res.maxCacheSize ) {
    res.maxCacheSize = opts[maxFromKey] * 3;
  }
  assertNumber(res, maxFromKey, method);
  assertNumber(res, 'maxCacheSize', method);
  return res;
}

function assertNumber(obj, key, method) {
  if( typeof obj[key] !== 'number' ) {
    throw new Error('Argument ' + key + ' passed into opts for ' + method + 'must be a number' );
  }
}