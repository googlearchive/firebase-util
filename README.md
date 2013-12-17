
# Firebase-util

This is a collection of power toys (mostly experimental) for use in Firebase. Right now it consists of one library.

## Libraries

 - [Firebase.util.join](src/join/README.md)
   Sync to multiple Firebase paths and seamlessly merge the data into a single object. You can use all your favorite
   Firbebase methods (on, once, set, etc) normally. The merged data is distributed back to the responsible paths
   during set/update/remove ops.

# Usage

## Setup

### On the web:

```html
<script src="http://static.firebase.com/v0/firebase.js"></script>
<script src="firebase-utils.min.js"></script>

<script>
   var ref = Firebase.util.join( new Firebase(PATH1), new Firebase(PATH2), ... );
   ref.on('child_added', function(snap) { console.log(snap.val()); });
</script>
```

### In node.js:

```javascript
var Firebase = require('firebase');
var FirebaseUtil = require('./firebase-utils.js');
var ref = FirebaseUtil.join( new Firebase(PATH1), new Firebase(PATH2), ... );
ref.on('child_added', function(snap) { console.log(snap.val()); });
```

# Global Utilities

## Firebase.util.logLevel(int)

Log debugging info to JavaScript console (or command line in node.js). Defaults to 'warn' (errors and warnings).
This can be set or changed at any time to any of the following:

```javascript
Firebase.util.logLevel(true);  // default logging (also accepts 'all' or 'on')
Firebase.util.logLevel(false); // all logging off (also accepts 0, 'off' or 'none')
Firebase.util.logLevel('error'); // error, warn, info, log, or debug
```

Debugging can also be enabled in the browser by adding `debugLevel=x` into the url's query parameters. This allows one to turn on debugging for quick troubleshooting without having to modify any code.

The logLevel() method returns a `revert` function that can be used to restore the logging level to it's previous value:

```javascript
// log a whole lotta junk
var revert = Firebase.util.logLevel('debug');

// ...run some code...

// revert to default logging
revert();
```

You can also filter log output with a RegExp:

```javascript
// only print logs that begin with "Path"
Firebase.util.logLevel('debug', /^Path/);
```

# Contributing

## Setup

If you don't have [Grunt](http://gruntjs.com/) installed, do it like so

```bash
npm install -g grunt
```

[Fork this project](https://help.github.com/articles/fork-a-repo) into your own GitHub repo

```bash
git clone https://github.com/YOURNAME/firebase-util.git
cd firebase-util
npm install
```

Declare environment variables for testing. In Mac/Linux:

```bash
FIREBASE_TEST_URL="https://INSTANCE.firebaseio.com"
FIREBASE_TEST_SECRET="xxoXaABB28..."
```

(For DOS use `set VAR=value`, for PowerShell, use `$env:VAR=value`)

Set security rules on your development Firebase as follows:

```json
{
  "rules": {
    ".read": "auth.id !== null",
    ".write": "auth.id !== null"
  }
}
```

Make project, monitor for changes, and automagically run test units:

```bash
grunt
```

## Best Practices

Read the [README.md under src/](src/README.md) for an overview of the standards, code structure, and utilities for development.

## Testing

Add test cases to cover any new code you create. Make sure all test cases pass before committing changes.
You must declare `FIREBASE_TEST_URL` and `FIREBASE_TEST_SECRET` first. (see setup).

You can run all test units at any time using `grunt test` or automagically after changes by using `grunt watch`.

Read the [README.md under test/](test/README.md) for details about test standards, structure, and helper methods.

## Committing changes

See [Using Pull Requests](https://help.github.com/articles/using-pull-requests).

Before submitting your pull requests, make sure your code meets the following criteria:

 - all test units for all packages must pass (100% success rate)
 - all public methods in your package must include a complete set of test cases
 - README.md must be complete and include summary, examples, and API details

<a name="license"></a>
# LICENSE

[The MIT LICENSE (MIT)](http://opensource.org/licenses/MIT)
