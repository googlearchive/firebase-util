
# Adding Libraries to Firebase.Util

## Development setup

See the [README.md](../README.md) in the root folder for setup instructions and rules for pull requests.

## Structuring your data

Your package should be placed in src/`mypackage`/ and should contain the following structure:

    src/package/libs/*.js  (dependencies and libs used by exports.js; if you need to enforce order of inclusion, prefix file names with a number)
    src/package/exports.js (functions to be put into the Firebase.Util public scope belong here and should be added onto exports)
    src/package/README.md  (documentation and instructions for your package)

Two global variables are made available to your library, `exports` and `fb`. Your library should look something like the following:

```javascript
(function(exports, fb) { // private scope for my package
   // declare my package in every lib and file I will access it from
   var mypackage = fb.package('mypackage');

   // available to any internal library by using fb.mypackage.utilityMethod
   mypackage.utilityMethod = function() {};

   // becomes Firebase.Util.publicMethod
   exports.publicMethod = function() {};
}(exports, fb);
```

Anything placed on the `exports` object will automagically be included into Firebase.Util. The README.md
instructions will automagically be linked from the root README.md file.

The `fb` object also contains a [utils library](global/util.js) and a [logger](global/logger.js) for dealing with common JavaScript shortcomings
like binding, iterating arrays and objects, finding values in arrays, binding functions, etc. A quick summary:

    fb.util:  isObject, isArray, extend, bind, isEmpty, keys, map, find, each, indexOf, sprintf, vsprintf
    fb.log:   error, warn, info, log, debug

## Debug Logging

The `fb.log` function wraps console.log in a safe manner, allowing for filtering of log output.

Unlike console.log, if the first argument to any fb.log function is a string, and it contains `%s`, `%d`, or `%j`, then it will
be called with a printf-like logic and all other arguments are substituted into the string.

   -  %s - String.
   -  %d - Number (both integer and float).
   -  %j - JSON.
   -  % - single percent sign ('%'). This does not consume an argument.

## Testing

All packages must include a complete set of test units. See [test/README.md](../test/README.md) for details.


