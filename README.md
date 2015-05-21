# Firebase-util

[![Build Status](https://travis-ci.org/firebase/firebase-util.svg?branch=master)](https://travis-ci.org/firebase/firebase-util)
[![Coverage Status](https://img.shields.io/coveralls/firebase/firebase-util.svg)](https://coveralls.io/r/firebase/firebase-util)
[![Version](https://badge.fury.io/gh/firebase%2Ffirebase-util.svg)](http://badge.fury.io/gh/firebase%2Ffirebase-util)

This is a collection of power toys (mostly experimental) and utilities for use in Firebase.

## The Tools

 - **Firebase.util.NormalizedCollection**
   Sync to multiple Firebase database paths and seamlessly merge the data into a single object. You can use most of your favorite
   Firebase database methods (on, once, set, etc) normally. The merged data is distributed back to the responsible paths
   during set/update/remove ops. [View Docs and API](src/NormalizedCollection/README.md)

 - **Firebase.util.Paginate**
   Infinite scrolling and pagination with Firebase data. [View Docs and API](src/Paginate/README.md)

## Setup

### In the browser

With Bower: `bower install firebase-util`

From the CDN: https://cdn.firebase.com/libs/firebase-util/x.x.x/firebase-util.min.js

```
<script>
   // off the global Firebase.util namespace
   var emailKey = Firebase.util.escapeEmail( anEmailAddress );

   // or in your browserify packages
   //var fbutil = require('firebase-util');
</script>
```

### In Node

```javascript
var fbutil = require('./firebase-util.js');
var emailKey = fbutil.escapeEmail( anEmailAddress );
```

## Global Utilities

### Firebase.util.logLevel(int)

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

# LICENSE

See [MIT LICENSE](MIT)
