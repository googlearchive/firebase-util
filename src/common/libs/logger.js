'use strict';
/*global window*/
var DEFAULT_LEVEL = 2; //  errors and warnings
var oldDebuggingLevel = false;
var fakeConsole = {
  error: noop, warn: noop, info: noop, log: noop, debug: noop, time: noop, timeEnd: noop, group: noop, groupEnd: noop
};
var util = require('./util.js');

var logger = function() {
  logger.log.apply(null, util.toArray(arguments));
};

/** hints for the IDEs */
logger.warn = noop;
logger.error = noop;
logger.info = noop;
logger.log = noop;
logger.debug = noop;
logger.isErrorEnabled = noop;
logger.isWarnEnabled = noop;
logger.isInfoEnabled = noop;
logger.isLogEnabled = noop;
logger.isDebugEnabled = noop;

/**
 * @param {int} level use -1 to turn off all logging, use 5 for maximum debugging
 * @param {string|RegExp} [grep] filter logs to those whose first value matches this text or expression
 */
logger.logLevel = function(level, grep) {
  if( typeof(level) !== 'number' ) { level = levelInt(level); }

  if( oldDebuggingLevel === level ) { return function() {}; }

  util.each(['error', 'warn', 'info', 'log', 'debug'], function(k, i) {
    var isEnabled = typeof(console) !== 'undefined' && level >= i+1;
    if( isEnabled ) {
      // binding is necessary to prevent IE 8/9 from having a spaz when
      // .apply and .call are used on console methods
      var fn = util.bind(console[k==='debug'? 'log' : k], console);
      logger[k] = function() {
        var args = util.toArray(arguments);
        if( args.length > 1 && typeof args[0] === 'string' ) {
          var m = args[0].match(/(%s|%d|%j)/g);
          if( m ) {
            var newArgs = [util.printf.apply(util, args)];
            args = args.length > m.length+1? newArgs.concat(args.slice(m.length+1)) : newArgs;
          }
        }
        if( !grep || !filterThis(grep, args) ) {
          fn.apply(typeof(console) === 'undefined'? fakeConsole : console, args);
        }
      };
    }
    else {
      logger[k] = noop;
    }
    logger['is' + ucfirst(k) + 'Enabled'] = function() { return isEnabled; };
  });

  // provide a way to revert the debugging level if I want to change it temporarily
  var off = (function(x) {
    return function() { logger.logLevel(x); };
  })(oldDebuggingLevel);
  oldDebuggingLevel = level;

  return off;
};

function ucfirst(s) {
  return s.charAt(0).toUpperCase() + s.substr(1);
}

function getDefaultLevel() {
  var m;
  if( typeof(window) !== 'undefined' && window.location && window.location.search ) {
    m = window.location.search.match('\bdebugLevel=([0-9]+)\b');
  }
  return m? parseInt(m[1], 10) : DEFAULT_LEVEL;
}

function noop() { return true; }

function filterThis(expr, args) {
  if( !args.length ) {
    return true;
  }
  else if( expr instanceof RegExp ) {
    return !expr.test(args[0]+'');
  }
  else {
    return !(args[0]+'').match(expr);
  }
}

function levelInt(x) {
  switch(x) {
    case false: return 0;
    case 'off': return 0;
    case 'none': return 0;
    case 'error': return 1;
    case 'warn': return 2;
    case 'warning': return 2;
    case 'info': return 3;
    case 'log': return 4;
    case 'debug': return 5;
    case true: return DEFAULT_LEVEL;
    case 'on': return DEFAULT_LEVEL;
    case 'all': return DEFAULT_LEVEL;
    default: return DEFAULT_LEVEL;
  }
}

logger.logLevel(getDefaultLevel());
module.exports = logger;