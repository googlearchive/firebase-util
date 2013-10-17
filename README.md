
# Firebase.Util

This is a collection of power toys (mostly experimental) for use in Firebase.

## Libraries

 - [Firebase.Util.Join](src/join/README.md)
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
   var ref = Firebase.Util.join( new Firebase(PATH1), new Firebase(PATH2), ... );
   ref.on('child_added', function(snap) { console.log(snap.val()); });
</script>
```

### In node.js:

```javascript
var FirebaseUtil = require('FirebaseUtil');
var ref = FirebaseUtil.join( new Firebase(PATH1), new Firebase(PATH2), ... );
ref.on('child_added', function(snap) { console.log(snap.val()); });
```

### Including specific packages

Specific packages can be included separately by adding the package name:
```html
<script src="firebase-utils.join.min.js"></script>
```

# Global Utilities

## Firebase.Util.logLevel(int)

Log debugging info to JavaScript console (or command line in node.js). Defaults to 'warn' (errors and warnings).
This can be set or changed at any time to any of the following:

```javascript
Firebase.Util.logLevel(true);  // default logging (also accepts 'all' or 'on')
Firebase.Util.logLevel(false); // all logging off (also accepts 0, 'off' or 'none')
Firebase.Util.logLevel('error');
Firebase.Util.logLevel('warn');
Firebase.Util.logLevel('info');
Firebase.Util.logLevel('log');
Firebase.Util.logLevel('debug');
```
Additionally, the logLevel() method returns a `revert` function that can be used to restore the logging level to it's previous value:

```javascript
// log a whole lotta junk
var revert = Firebase.Util.logLevel('debug');
/*
   ...call some Firbase.Util commands...
*/
revert(); // revert to default logging
```

Debugging can also be enabled in the browser by adding `debugLevel=x` into the url's query parameters. This allows one to turn on debugging for quick troubleshooting without having to modify any code.

# Contributing

## Setup

If you don't have [Grunt](http://gruntjs.com/) installed, do it like so

```bash
npm install -g grunt
```

[Fork this project](https://help.github.com/articles/fork-a-repo) into your own GitHub repo

```bash
git clone https://github.com/YOURNAME/FirebaseJoin.git
cd FirebaseJoin
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

## Testing

Add test cases to cover any new code you create. Make sure all test cases pass before committing changes.
You must declare `FIREBASE_TEST_URL` and `FIREBASE_TEST_SECRET` first. (see setup)

```bash
grunt test
```

## Committing changes

See [Using Pull Requests](https://help.github.com/articles/using-pull-requests).

Before submitting your pull requests, make sure your code meets the following criteria:

 - all test units for all packages must pass (100% success rate)
 - all public methods in your package must include a complete set of test cases
 - README.md must be complete and include summary, examples, and API details

<a name="license"></a>
# LICENSE

[The MIT LICENSE (MIT)](http://opensource.org/licenses/MIT)
