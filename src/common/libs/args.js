'use strict';
var util = require('./util.js');
var log = require('./logger.js');

function Args(fnName, args, minArgs, maxArgs) {
  if( typeof(fnName) !== 'string' || !util.isObject(args) ) {
    throw new Error('Args requires at least 2 args: fnName, arguments[, minArgs, maxArgs]');
  }
  if( !(this instanceof Args) ) { // allow it to be called without `new` prefix
    return new Args(fnName, args, minArgs, maxArgs);
  }
  this.fnName = fnName;
  this.argList = util.toArray(args);
  this.origArgs = util.toArray(args);
  var len = this.length = this.argList.length;
  this.pos = -1;
  if(util.isUndefined(minArgs)) { minArgs = 0; }
  if(util.isUndefined(maxArgs)) { maxArgs = this.argList.length; }
  if( len < minArgs || len > maxArgs ) {
    var rangeText = maxArgs > minArgs? util.printf('%d to %d', minArgs, maxArgs) : minArgs;
    throw Error(util.printf('%s must be called with %s arguments, but received %d', fnName, rangeText, len));
  }
}

Args.prototype = {
  /**
   * Grab the original list of args
   * @return {Array} containing the original arguments
   */
  orig: function() { return this.origArgs.slice(0); },

  /**
   * Return whatever args remain as a list
   * @returns {Array|string|Buffer|Blob|*}
   */
  restAsList: function(minLength, types) {
    var list = this.argList.slice(0);
    if( minLength || types ) {
      for (var i = 0, len = list.length; i < len; i++) {
        this._arg(types||true, null, i < minLength);
      }
    }
    return list;
  },

  /**
   * Advance the argument list by one and discard the value
   * @return {Args}
   */
  skip: function() {
    if( this.argList.length ) {
      this.pos++;
      this.argList.shift();
    }
    return this;
  },

  /**
   * Read the next optional argument, but only if `types` is true, or it is of a type specified
   * In the case that it is not present, return `defaultValue`
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   * @param [defaultValue]
   */
  next: function(types, defaultValue) {
    return this._arg(types, defaultValue, false);
  },

  /**
   * Read the next optional argument, but only if `types` is true, or it is of a type specified. In the case
   * that it is not present, return `defaultValue` and log a warning to the console
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   * @param [defaultValue]
   */
  nextWarn: function(types, defaultValue) {
    return this._arg(types, defaultValue, 'warn');
  },

  /**
   * Read the next required argument, but only if `types` is true, or it is of a type specified. In the case
   * that it is not present, throw an Error
   * @param {boolean|Array|string} types either `true` or one of array, string, object, number, int, boolean, boolean-like, or function
   */
  nextReq: function(types) {
    return this._arg(types, null, true);
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * return defaultValue.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue]
   */
  nextFrom: function(choices, defaultValue) {
    return this._from(choices, defaultValue, false);
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * return defaultValue and log a warning to the console.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue]
   */
  nextFromWarn: function(choices, defaultValue) {
    return this._from(choices, defaultValue, 'warn');
  },

  /**
   * Read the next optional argument, which must be one of the values in choices. If it is not present,
   * throw an Error.
   * @param {Array} choices a list of allowed values
   */
  nextFromReq: function(choices) {
    return this._from(choices, null, true);
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, return defaultValue.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
   */
  listFrom: function(choices, defaultValue) {
    return this._list(choices, defaultValue, false);
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, return defaultValue and log a warning.
   * @param {Array} choices a list of allowed values
   * @param [defaultValue] a set of defaults, setting this to true uses the `choices` as default
   */
  listFromWarn: function(choices, defaultValue) {
    return this._list(choices, defaultValue, 'warn');
  },

  /**
   * Read the next optional argument and return it as an array (it can optionally be an array or a single value
   * which will be coerced into an array). All values in the argument must be in choices or they are removed
   * from the choices and a warning is logged. If no valid value is present, throw an Error.
   * @param {Array} choices a list of allowed values
   */
  listFromReq: function(choices) {
    return this._list(choices, null, true);
  },

  _arg: function(types, defaultValue, required) {
    this.pos++;
    if( util.isUndefined(types) || types === null ) { types = true; }
    if( this.argList.length && isOfType(this.argList[0], types) ) {
      return format(this.argList.shift(), types);
    }
    else {
      if( required ) {
        assertRequired(required, this.fnName, this.pos, util.printf('must be of type %s', types));
      }
      return defaultValue;
    }
  },

  _from: function(choices, defaultValue, required) {
    this.pos++;
    if( this.argList.length && util.contains(choices, this.argList[0]) ) {
      return this.argList.shift();
    }
    else {
      if( required ) {
        assertRequired(required, this.fnName, this.pos, util.printf('must be one of %s', choices));
      }
      return defaultValue;
    }
  },

  _list: function(choices, defaultValue, required) {
    this.pos++;
    var out = [];
    var list = this.argList[0];
    if( this.argList.length && !util.isEmpty(list) && (util.isArray(list) || !util.isObject(list)) ) {
      this.argList.shift();
      if( util.isArray(list) ) {
        out = util.map(list, function(v) {
          if( util.contains(choices, v) ) {
            return v;
          }
          else {
            badChoiceWarning(this.fnName, v, choices);
            return undefined;
          }
        }, this);
      }
      else {
        if( util.contains(choices, list) ) {
          out = [list];
        }
        else {
          badChoiceWarning(this.fnName, list, choices);
        }
      }
    }
    if( util.isEmpty(out) ) {
      if( required ) {
        assertRequired(required, this.fnName, this.pos,
          util.printf('choices must be in [%s]', choices));
      }
      return defaultValue === true? choices : defaultValue;
    }
    return out;
  }

};

function isOfType(val, types) {
  if( types === true ) { return true; }
  if( !util.isArray(types) ) { types = [types]; }
  return util.contains(types, function(type) {
    switch(type) {
      case 'array':
        return util.isArray(val);
      case 'string':
        return typeof(val) === 'string';
      case 'number':
        return isFinite(parseInt(val, 10));
      case 'int':
      case 'integer':
        return isFinite(parseFloat(val));
      case 'object':
        return util.isObject(val);
      case 'function':
        return typeof(val) === 'function';
      case 'bool':
      case 'boolean':
        return typeof(val) === 'boolean';
      case 'boolean-like':
        return !util.isObject(val); // be lenient here
      default:
        throw new Error('Args received an invalid data type: '+type);
    }
  });
}

function assertRequired(required, fnName, pos, msg) {
  msg = util.printf('%s: invalid argument at pos %d, %s (received %s)', fnName, pos, msg);
  if( required === true ) {
    throw new Error(msg);
  }
  else if( util.has(log, required) ) {
    log[required](msg);
  }
  else {
    throw new Error('The `required` value passed to Args methods must either be true or a method name from logger');
  }
}

function badChoiceWarning(fnName, val, choices) {
  log.warn('%s: invalid choice %s, must be one of [%s]', fnName, val, choices);
}

function format(val, types) {
  if( types === true ) { return val; }
  var type = util.isArray(types)? types[0] : types;
  switch(type) {
    case 'array':
      return util.isArray(val)? val : [val];
    case 'string':
      return val + '';
    case 'number':
      return parseFloat(val);
    case 'int':
    case 'integer':
      return parseInt(val, 10);
    case 'bool':
    case 'boolean':
    case 'boolean-like':
      return !!val;
    case 'function':
    case 'object':
      return val;
    default:
      throw new Error('Args received an invalid data type: '+type);
  }
}

module.exports = Args;