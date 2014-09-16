"use strict";
var undefined;
var DEFAULT_LEVEL = 2; //  errors and warnings
var _ = require('lodash');
var oldDebuggingLevel = false;
var fakeConsole = {
  error: noop, warn: noop, info: noop, log: noop, debug: noop, time: noop, timeEnd: noop, group: noop, groupEnd: noop
};
var logger = function() {
  logger.log.apply(null, _.toArray(arguments));
};

/**
 * @param {int} level use -1 to turn off all logging, use 5 for maximum debugging
 * @param {string|RegExp} [grep] filter logs to those whose first value matches this text or expression
 */
exports.logLevel = logger.logLevel = function(level, grep) {
  if( typeof(level) !== 'number' ) { level = levelInt(level); }

  if( oldDebuggingLevel === level ) { return function() {}; }

  _.each(['error', 'warn', 'info', 'log', 'debug'], function(k, i) {
    if( typeof(console) !== 'undefined' && level >= i+1 ) {
      // binding is necessary to prevent IE 8/9 from having a spaz when
      // .apply and .call are used on console methods
      var fn = _.bind(console[k==='debug'? 'log' : k], console);
      logger[k] = function() {
        var args = _.toArray(arguments);
        if( typeof(args[0]) === 'string' && args[0].match(/(%s|%d|%j)/) ) {
          args = printf(args);
        }
        if( !grep || !filterThis(grep, args) ) {
          fn.apply(typeof(console) === 'undefined'? fakeConsole : console, args);
        }
      };
    }
    else {
      logger[k] = noop;
    }
  });

  // provide a way to revert the debugging level if I want to change it temporarily
  var off = (function(x) {
    return function() { exports.logLevel(x) };
  })(oldDebuggingLevel);
  oldDebuggingLevel = level;

  return off;
};

function getDebugLevel() {
  var m;
  if( typeof(window) !== 'undefined' && window.location && window.location.search ) {
    m = window.location.search.match('\bdebugLevel=([0-9]+)\b');
  }
  return m? parseInt(m[1], 10) : DEFAULT_LEVEL;
}

function noop() { return true; }

function printf(args) {
  var localArgs = args.slice(0); // make a copy
  var template = localArgs.shift();
  var matches = template.match(/(%s|%d|%j)/g);
  matches && _.each(matches, function(m) {
    template = template.replace(m, format(localArgs.shift(), m));
  });
  return [template].concat(localArgs);
}

function format(v, type) {
  switch(type) {
    case '%d':
      return parseInt(v, 10);
    case '%j':
      v =  _.isObject(v)? JSON.stringify(v) : v+'';
      if(v.length > 500) {
        v = v.substr(0, 500)+'.../*truncated*/...}';
      }
      return v;
    case '%s':
      return v + '';
    default:
      return v;
  }
}

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

exports.logLevel(getDebugLevel());
exports.log = logger;