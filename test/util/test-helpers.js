
var _ = require('lodash');

var doAfterTest = (function() {
  var subs = [];
  afterEach(function() {
    _.each(subs, function(fn) { fn(); });
    subs = [];
  });

  return function(fn, context) {
    subs.push(_.bind.apply(null, _.toArray(arguments)));
  }
})();