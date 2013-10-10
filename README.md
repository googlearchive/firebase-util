
# FirebaseJoin

Sync to multiple Firebase paths and seamlessly merge the data into a single object. You can use all your favorite
Firbebase methods (on, once, set, etc) normally. The merged data is distributed back to the responsible paths
during set/update/remove ops.

An instance of this class can be used anywhere a normal Firebase reference would work, including [angularFire](http://angularfire.com/).

 - [Usage](#usage)
    - [Setup](#setup)
    - [Writing data: set, update, remove, and push](#writing_data)
    - [Working with primitives](#working_with_primitives)
    - [Dynamic path names](#dynamic_path_names)
    - [Dealing with conflicting fields (key maps)](#keymaps)
    - [Configuration options](#configuration_options)
 - [API](#api)
    - [FirebaseUtil.join](#api_join)
    - [FirebaseUtil.union](#api_union)
    - [FirebaseUtil.intersection](#api_intersection)
    - [JoinedRecord](#api_joinedrecord)
    - [JoinedSnapshot](#api_joinedsnapshot)
 - [Contributing](#contributing)
 - [License (MIT)](#license)

<a name="usage"></a>
# Usage

<a name="setup"></a>
## Setup

### On the web:

```html
<script src="http://static.firebase.com/v0/firebase.js"></script>
<script src="fbjoin.min.js"></script>

<script>
   var ref = new FirebaseJoin( new Firebase(PATH1), new Firebase(PATH2), ... );
   ref.on('child_added', function(snap) { console.log(snap.val()); });
</script>
```

### In node.js:

```javascript
var FirebaseJoin = require('./fbjoin.js');
var ref = new FirebaseJoin( new Firebase(PATH1), new Firebase(PATH2), ... );
ref.on('child_added', function(snap) { console.log(snap.val()); });
```

<a name="writing_data"></a>
## Writing data: set, update, remove, and push

Set, update, remove, and push operations behave logically, applying appropriate child sets of the data to their respective paths.

If any of these operations could be called against an empty path or before data is downloaded using on() or once(), then
you will need to specify a [key map](#keymaps) or these operations will fail with an error (we won't know where to map
the data to).

For example, given this data:

```javascript
{
   path1: {
      foo: {a: 1, b: 2},
      bar: {a: 100, b: 200}
   },
   path1: {
      foo: {c: 3},
      bar: {c: 300}
   }
}
```

We could do any of these ops:

```javascript
   var fb = new Firebase(URL);
   var ref = FirebaseUtil.join( fb.child('path1'), fb.child('path2') )

   ref.child('foo').set({a: 11, c: 33});
   // path1: { foo: {a: 11 /* b removed! */}, ... }, path2: { foo: {c: 33}, ... }
   
   ref..child('foo').update({b: 'hello'});
   // path1: { foo: {a: 1, b: "hello"}, ... }, path2: { foo: {c: 3}, ... }
   
   ref.remove();
   // path1: { /* foo removed! */, ... }, path2: { /* foo removed! */, ... }

   ref.push({a: 1000, b: 2000, c: 3000});
   // path1: { "-0xBAF...": {a: 1000, b: 2000}, ...}, path2: {"-0xBAF...": {c: 3000}, ...}
```

<a name="working_with_primitives"></a>
## Works with Primitives

This class can accept paths that store primitives, objects, or arrays
Primitive values are stored using the path's parent name.

For example, given this data:

```javascript
{
   car: { 123: "Ford GT" }
   truck: { 123: "Ford F150" }
}
```

We could do this:

```javascript
var ref = new FirebaseJoin( new Firebase("INSTANCE/car"), new Firebase("INSTANCE/truck") );

ref.once("value", ...);
// results: { 123: {car: "Ford GT", truck: "Ford F150"} }

ref.child(123).set({ car: "Ford Mustang", truck: "Ford Studebaker" });
// in Firebase: { car: {123: "Ford Mustang"}, truck: {123: "Ford Studebaker"} }
```

Conflicting field names can be resolved by adding a `.value` key to the `keyMap` property, [see key maps](#keymaps):

```javascript
new FirebaseJoin( {ref: new Firebase('INSTANCE/car'), keyMap: {'.value': 'foo'}}, new Firebase('INSTANCE/truck') );
// results: { 123: {foo: "Ford GT", truck: "Ford F150"} }
```

<a name="dynamic_path_names"></a>
## Dynamic Path Names

To include records from paths which don't have matching key hierarchies, a mapping function can be provided in place
of the Firebase ref. It will be passed a record from any intersecting path (whichever loads first) and
determines how to look up the secondary records. Note that at least one path must exist which is a Firebase reference.

For example, given this data structure:

```javascript
{
   account: {
      kato: {
          email: "wulf@firebase.com",
          member_since: "2013"
      }
   },
//
   profile: {
      "kato": {
          name: "Michael Wulf",
          nick: "Kato",
          style: "Kung Fu"
      }
   },
//
   styles: {
       "Kung Fu": {
          description: "Chinese system based on physical exercises involving animal mimicry"
       }
   }
}
```

We could use this join:

```javascript
new FirebaseJoin(
    new Firebase('INSTANCE/account'),
    new Firebase('INSTANCE/profile'),
    function(recordId, parentName, snapshot) {
      if( parentName === 'profile' ) {
         var style = snapshot.val().style;
         return new Firebase('INSTANCE/styles/'+style+'/description');
      }
      else {
         // wait for the profile to load
         return undefined;
      }
    }
);
```

<a name="keymaps"></a>
## Dealing with conflicting fields (key maps)

If there is no data at the path we are going to merge, or paths have conflicting field names, we can map each field
in the data to a particular path by adding a key map hash.

For example, given this data:

```javascript
{
   "profile": {
      "kato": {
         "name": "Michael Wulf",
         "email": "wulf@firebase.com"
      }
   },

   "facebook_profile": {
      "kato": {
         "id": "A98441133B64",
         "name": "Stupendous Man"
      }
   }
}
```

We could use do this:

```javascript
var fb = new Firebase(URL);
var ref = FirebaseUtil.join( {ref: fb.child('profile'), keyMap: {'name': 'profile_name'}}, fb.child('facebook_profile') );
ref.once('value', function(snap) {
   snap.val(); // { kato: { profile_name: "Michael Wulf", name: "Stupendous Man", id: "A98441133B64" } }
});
```

Note that, because we declared a keyMap for the first ref, but didn't include email, that it doesn't exist in the results.
Thus, a keymap could also be used to filter data added into the join. Be careful using this in conjunction with update()
or set()!

<a name="configuration_options"></a>
## Configuration options

The `paths` elements passed to the FirebaseJoin constructor contain a Firebase ref, a function, or a hash.
The hash is structured as follows:

   - **ref**: {Firebase|Function} (required!) ref to the parent path for this set of records
   - **intersects**: {boolean} defaults to false, if true the join will only contain records that exist in this path
   - **dataKey**: {string} specify the data key if this path contains primitive values
   - **sortBy**: {boolean} sort records by this path's ordering
   - **keyMap**: {Object} map fields specific to each Firebase ref, see [key maps](#keymaps)

<a name="api"></a>
# API

<a name="api_join"></a>
## FirebaseUtil.join( path[, path...] )

<a name="api_union"></a>
## FirebaseUtil.union( path[, path...] )

<a name="api_intersection"></a>
## FirebaseUtil.intersection( path[, path...] )

<a name="api_joinedrecord"></a>
## JoinedRecord

A wrapper on [Firebase](https://www.firebase.com/docs/javascript/firebase/index.html) containing
a reference to all the joined paths, and providing most of the normal functionality with these exceptions:

   - **on**: callbacks receive a [JoinedSnapshot](#api_joinedsnapshot) instance
   - **once**: callbacks receive a [JoinedSnapshot](#api_joinedsnapshot) instance
   - **child**: returns a [JoinedRecord](#api_joinedrecord) instance
   - **parent**: <span style="color:red">throws an Error</span>
   - **name**: returns an array of path names, one for each path
   - **set**: see [Writing data](#writing_data)
   - **setWithPriority**: sets priority on all of the paths
   - **setPriority**: sets priority on all of the paths
   - **update**: see [Writing data](#writing_data)
   - **remove**: removes records at all the joined paths
   - **limit**: <span style="color:red">throws an Error</span>
   - **endAt**: <span style="color:red">throws an Error</span>
   - **startAt**: <span style="color:red">throws an Error</span>
   - **push**: see [Writing data](#writing_data)
   - **root**: returns a Firebase reference
   - **toString**: returns toString() for the first path
   - **transaction**: <span style="color:red">throws an Error</span>
   - **onDisconnect**:  <span style="color:red">throws an Error</span>

<a name="api_joinedsnapshot"></a>
## JoinedSnapshot

A wrapper on [DataSnapshot](https://www.firebase.com/docs/javascript/datasnapshot/index.html) containing
data from all the joined paths, and providing most of the normal snapshot functionality with these exceptions:

   - **child**: once a child ref is obtained, parent() will not return back to this merged snapshot, but rather to the path of that child's actual parent!
   - **name**: returns an array of path names, one for each path
   - **ref**: returns a [JoinedRecord](#api_joinedrecord) instance
   - **getPriority**: returns an array of priorities, one for each path
   - **exportVal**: returns the merged values by calling exportVal() on each path ref and extending the previous results

<a name="contributing"></a>
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
grunt
```

## Testing

Add test cases to cover any new code you create. Make sure all test cases pass before committing changes.

```bash
grunt test
```

## Committing changes

See [Using Pull Requests](https://help.github.com/articles/using-pull-requests)

<a name="license"></a>
# LICENSE

[The MIT LICENSE (MIT)](http://opensource.org/licenses/MIT)
