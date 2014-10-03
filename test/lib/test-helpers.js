
//var _ = require('lodash');
//var exports = exports || {};
//
//exports.doAfterTest = (function() {
//  var subs = [];
//  afterEach(function() {
//    _.each(subs, function(fn) { fn(); });
//    subs = [];
//  });
//
//  return function(fn, context) {
//    subs.push(_.bind.apply(null, _.toArray(arguments)));
//  }
//})();
//
//beforeEach(function() {
//  this.helpers = exports;
//});