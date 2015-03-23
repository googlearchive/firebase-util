/**
 * This file loads all the public methods from
 * the common/ library. To fetch all methods
 * for internal use, just do require('./src/common'),
 * which loads index.js and includes the private methods.
 */

var util = require('./index.js');
exports.log = util.log;
exports.logLevel = util.logLevel;
exports.escapeEmail = util.escapeEmail;