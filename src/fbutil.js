/**
 * This file establishes the Firebase.util namespace and
 * defines the exports for all packages when using node.js
 */
'use strict';

var util = require('./common/index.js');

// put all our public methods into the exported scope
util.extend(exports,
  require('./common/exports.js'),
  require('./NormalizedCollection/exports.js')
);