
# Adding Libraries to Firebase.util

## Development setup

See the [README.md](../README.md) in the root folder for setup instructions and rules for pull requests.

## Structuring your data

Your package should be placed in src/`mypackage`/ and should contain the following structure:

    src/package/libs/*.js  (dependencies and libs used by exports.js; if you need to enforce order of inclusion, prefix file names with a number)
    src/package/exports.js (functions to be put into the Firebase.util public scope belong here and should be added onto exports)
    src/package/README.md  (documentation and instructions for your package)

Two global variables are made available to your library, `exports` and `fb`. Your library should look something like the following:

```javascript
(function(exports, fb) { // private scope for my package
   // declare my package in every lib and file I will access it from
   var mypackage = fb.pkg('mypackage');

   // available to any internal library by using fb.mypackage.utilityMethod
   mypackage.utilityMethod = function() {};

   // becomes Firebase.util.publicMethod
   exports.publicMethod = function() {};
}(exports, fb);
```

Anything placed on the `exports` object will automagically be included into Firebase.util. The README.md
instructions will automagically be linked from the root README.md file.

The `fb` object also contains a [utils library](global/util.js) and a [logger](global/logger.js) for dealing with common JavaScript shortcomings
like binding, iterating arrays and objects, finding values in arrays, binding functions, etc. A quick summary:

    fb.util:  isObject, isArray, extend, bind, isEmpty, keys, map, find, each, indexOf, sprintf, vsprintf
    fb.log:   error, warn, info, log, debug

## Debug Logging

The `util.log` function wraps console.log in a safe manner, allowing for filtering of log output.

Unlike console.log, if the first argument to any util.log function is a string, and it contains `%s`, `%d`, or `%j`, then it will
be called with a printf-like logic and all other arguments are substituted into the string.

   -  %s - String.
   -  %d - Number (both integer and float).
   -  %j - JSON.
   -  % - single percent sign ('%'). This does not consume an argument.

### Obey these conventions
   - begin each log with a Class name for easy filtering
   - choose the right severity
   - do not concatenate or parse json ahead of time, let the printf functions do that (for performance in production)

### Choose the right severity

Use the escalation approach:

   - Don't enter a log message until you need it.
   - Start with debug()
   - The first time it helps you solve a problem, promote it to log()
   - If you use it frequently, promote it to info()
   - If it helps customers with the big picture, use info()
   - If it indicates config errors, common mistakes, or potential bugs use warn() or error()

All of the following are valid log function calls:

```javascript
var log = util.pkg('log');
log('Class: hello %s', "world");
log('Class: json value: %j', {foo: bar}, 'more', 'args', 'not in sprintf');  // additional args are sent directly to console

log.debug('Class: hello %s', "world");
log.log('Class: hello %s', "world");
log.info('Class: hello %s', "world");
log.warn('Class: hello %s', "world");
log.error('Class: hello %s', "world");
```

## Testing

All packages must include a complete set of test units. See [test/README.md](../test/README.md) for details.


