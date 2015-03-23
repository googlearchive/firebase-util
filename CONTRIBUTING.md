# Setup

If you don't have [Gulp](http://gulpjs.com/) and [Bower]() installed, do it like so

```bash
npm install -g gulp bower
```

[Fork this project](https://help.github.com/articles/fork-a-repo) into your own GitHub repo

```bash
git clone https://github.com/YOURNAME/firebase-util.git
cd firebase-util
npm install
bower install
gulp
```

Build, lint, minify, run all tests including end-to-end, and generally wreak havoc.

```bash
gulp
```

Scaffold a new class and create a unit test for it.

```bash
gulp scaffold -d DIRECTORY_UNDER_SRC -t class -n NameOfFile
```

# Best Practices

## Testing

Add test cases to cover any new code you create. Make sure all test cases pass before committing changes.

You can run all test units at any time using `grunt test` or automagically after changes by using `grunt watch`.

Read the [README.md under test/](test/README.md) for details about test standards, structure, and helper methods.

# Adding Libraries to Firebase.util

## Structuring your data

Your package should be placed in src/`mypackage`/ and should contain the following structure:

    src/package/libs/*.js  (the meat and classes of the new package)
    src/package/exports.js (functions to be put into the Firebase.util public scope belong here)
    src/package/README.md  (documentation and instructions for your package)

Write your code like any node module. You can use require() on other packages. **Do not include
external npm dependencies without Firebase team consent**. You don't need to wrap all of your code 
in a function scope.

An example exports.js file:
```javascript
// include global utils
var fbutil = require('../../common');

exports.tool1 = require('./libs/tool1');
exports.tool2 = require('./libs/tool2');
```

## Debug Logging

The `fbutil.log()` function wraps console.log in a safe manner, allowing for filtering of log output.

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

Unit tests are written in Jasmine and run inside PhantomJS via Karma.

All packages must include a complete set of test units. They should be kept in 
test/ModuleName/**.spec.js. Check out test/lib/ for some common tools and existing tests for 
examples.

//todo End-to-end tests?
