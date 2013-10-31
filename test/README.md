
# Test Units Readme

This test suite uses [mocha](http://visionmedia.github.io/mocha/) and [chai](http://chaijs.com/). You can use [BDD](http://visionmedia.github.io/mocha/#interfaces) or [TDD](http://visionmedia.github.io/mocha/#interfaces)
structures, and [Expect/Should](http://chaijs.com/api/bdd/) or [Assert](http://chaijs.com/api/assert/) style assertions. The sky is the limit.

## Setup

See the [README.md](../README.md) in the root folder for setup and dev instructions.

Be sure to [include an appropriate require](http://chaijs.com/) for expect, should, or assert.

## Running Tests

    grunt test
    grunt watch

## Test Standards

 - tests should be named test.`package`.`FileToTest`.js, where package is the directory under src/ where the package is kept
 - store data sets in test/util/data.`package`.json (keep data sets small and specific to the test units)
 - tests should clear all Firebase data and rebuild before each test (don't worry about cleanup after tests)
 - all tests need to authenticate before writing to the dev firebase

Here's a recommended before/after combo for any tests that need Firebase access:

```javascript
   var helpers = require('./util/test-helpers.js');
   var data = require('./util/data.PACKAGE_NAME.json');

   beforeEach(function(done) {
      helpers.reset(data, done);
   });

   afterEach(helpers.unauth);
```

## Test Helpers

A suite of helper utilities is included in test/util/test-helpers.js for authenticating, setting, getting,
and interacting with Firebase quickly. See inline docs for details. Here is a quick summary:

   - **helpers.sup()**: authenticate using Firebase secret (i.e. super user)
   - **helpers.auth(user)**: authenticate as a given user id (test-user is recommended)
   - **helpers.unauth()**: revoke authentication
   - **helpers.set(path)**: set data to Firebase path
   - **helpers.get(path)**: get data from Firebase path
   - **helpers.ref(path)**: create a Firebase reference
   - **helpers.tok(user)**: create a Firebase auth token in format { id: user }
   - **helpers.handle(deferred)**: resolve or reject a deferred object when a standard node.js callback returns (e.g. function(err) {...})
   - **helpers.debugThisTest([level][, grep])**: temporarily turn on logging (to 'log' by default) until this test unit finishes
   - **helpers.chain()**: chain several helpers calls together: helpers.chain().sup().set(...).auth(...).get(...).then(...).testDone(...);