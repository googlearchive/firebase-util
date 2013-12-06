
# Firebase.Util.Join

Sync to multiple Firebase paths and seamlessly merge the data into a single object. You can use all your favorite
Firbebase methods (on, once, set, etc) normally. The merged data is distributed back to the responsible paths
during set/update/remove ops.

A JoinedRecord can be used anywhere a normal Firebase reference would work, including references passed into [angularFire](http://angularfire.com/).

 - [Usage](#usage)
    - [Writing data: set, update, remove, and push](#writing_data)
    - [Working with primitives](#working_with_primitives)
    - [Dealing with conflicting fields (key maps)](#keymaps)
    - [Queries: limit, startAt, and endAt](#queries)
    - [Configuration options](#configuration_options)
    - [Dynamic paths as keys](#dynamic_path_names)
 - [Limitations](#limitations)
 - [Troubleshooting and Help](#troubleshooting)
 - [API](#api)
    - [Firebase.Util.join](#api_join)
    - [Firebase.Util.union](#api_union)
    - [Firebase.Util.intersection](#api_intersection)
    - [JoinedRecord](#api_joinedrecord)
    - [JoinedSnapshot](#api_joinedsnapshot)
 - [Contributing](#contributing)
 - [License (MIT)](#license)

# Usage

<a name="writing_data"></a>
## Writing data: set, update, remove, and push

Set, update, remove, and push operations behave logically, applying appropriate child sets of the data to their respective paths.

For example, given this data:

```javascript
{
   path1: {
      foo: {a: 1, b: 2},
      bar: {a: 100, b: 200}
   },
   path2: {
      foo: {c: 3},
      bar: {c: 300}
   }
}
```

We could do any of these ops:

```javascript
   var fb = new Firebase(URL);

   // all your paths are belong to us
   var ref = Firebase.Util.join( fb.child('path1'), fb.child('path2') )

   ref.child('foo').set({a: 11, c: 33});
   // sets path1/foo to: {a: 11 /* b removed! */}
   // sets path2/foo to: {c: 33}

   ref.child('foo').update({b: 'hello'});
   // updates path1/foo to: {a: 1, b: "hello"}
   // leaves path2/foo alone: {c: 3}

   ref.remove();
   // removes both path1/foo and path2/foo

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
var ref = Firebase.Util.join( new Firebase("INSTANCE/car"), new Firebase("INSTANCE/truck") );

ref.once("value", ...);
// results: { 123: {car: "Ford GT", truck: "Ford F150"} }

ref.child(123).set({ car: "Ford Mustang", truck: "Ford Studebaker" });
// in Firebase: { car: {123: "Ford Mustang"}, truck: {123: "Ford Studebaker"} }
```

But what if we had two conflicting paths like this?

{
   model/car: { 123: "Ford GT" }
   year/car:  { 123: "1986" }
}

The conflicting path names can be resolved using the `keyMap` property ([see key maps](#keymaps)):

```javascript
ver ref = Firebase.Util.join(
   {ref: new Firebase('INSTANCE/model/car'), keyMap: {'.value': 'model'}},
   {ref: new Firebase('INSTANCE/year/car'), keyMap: {'.value': 'year'}}
)

ref.once('value', ...);
// results: { 123: { model: "Ford GT", year: "1986"} }
```

<a name="keymaps"></a>
## Dealing with conflicting fields (key maps)

If paths have conflicting field names  or if we simply want to restrict which fields get used, we can map each
field in the data to a particular path by adding a key map.

The key map can be an array, which simply specifies the list of fields which belong to this path, or a hash
that assigns them new key names in the joined data.

For example, given this data with conflicting name keys:

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

We could use this:

```javascript
var fb = new Firebase(URL);
var ref = Firebase.Util.join(
   fb.child('profile'),
   // only fetch id from facebook_profile
   {ref: fb.child('facebook_profile'), keyMap: ['id']}
);
ref.once('value', ...);
// { kato: { name: "Michael Wulf", email: "wulf@firebase.com", id: "A98441133B64" } }
```

Or we could get both names and remove the email using this:

```javascript
var fb = new Firebase(URL);
var ref = Firebase.Util.join(
   {ref: fb.child('profile'), keyMap: {'name': 'profile_name'}},
   fb.child('facebook_profile')
);

ref.once('value', ...);
// { kato: { profile_name: "Michael Wulf", name: "Stupendous Man", id: "A98441133B64" } }
```

Note that, because we declared a keyMap for the first ref, but didn't include email, it doesn't exist in the results.
Thus, a keymap could also be used to filter data added into the join.

Be careful using this in conjunction with set() as values not in the keyMap are removed on set ops! (You can use
update() to avoid this)

<a name="queries"></a>
## Queries: limit, startAt, and endAt

If you attempt to call limit(), startAt(), or endAt() on a [JoinedRecord](#api_joinedrecord) it will throw an Error.
The desired behavior is very difficult to define in a global manner. (Feel free to send feedback if you come up
with some applicable use cases! wulf@firebase.com)

You can use query operations on a Firebase reference before passing it into the join/union/intersection methods. However,
 this probably only makes sense for intersecting paths, and probably only if exactly one path has these constraints. Otherwise,
 results are likely to contain logically senseless unions of unmatched data.

```javascript
var indexRef = new Firebase('URL/index_path').limit(10);
Firebase.Util.intersection( indexRef, new Firebase('URL/data_path') );
```

<a name="configuration_options"></a>
## Configuration options

The `paths` elements passed to the FirebaseJoin constructor contain a Firebase ref, a function, or a hash.
The hash is structured as follows:

   - **ref**: {Firebase|Function} (required!) ref to the parent path for this set of records
   - **intersects**: {boolean} defaults to false, if true the join will only contain records that exist for (i.e. intersect) this path
   - **sortBy**: {boolean} sort records using this path's data?
   - **keyMap**: {Array|Object} map fields specific to each Firebase ref, see [key maps](#keymaps)

<a name="dynamic_path_names"></a>
## Dynamic Paths as Keys

To include records from paths which don't have matching key hierarchies, a Firebase ref can
be put into the keyMap. It will be loaded when the source path is loaded and its contents put into the key.

For example, given this data structure:

```javascript
{
   account: {
      kato: {
          email: "wulf@firebase.com",
          member_since: "2013"
      }
   },

   profile: {
      "kato": {
          name: "Michael Wulf",
          nick: "Kato",
          style: "Kung Fu"
      }
   },

   styles: {
       "Kung Fu": {
          description: "Chinese system based on physical exercises involving animal mimicry"
       }
   }
}
```

We could use this join:

```javascript
var ref = Firebase.Util.join(
    new Firebase('INSTANCE/account'),
    {
       ref: new Firebase('INSTANCE/profile'),
       keyMap: {
          name: 'name',
          nick: 'nick',
          style: new Firebase('INSTANCE/styles')
       }
    }
);

ref.on('value', ...);
// {
//    kato: {
//       email: "wulf@firebase.com",
//       member_since: "2013",
//       name:  "Michael Wulf",
//       nick:  "Kato",
//       style: { '.id': 'Kung Fu', description: "Chinese system based on physical exercises involving animal mimicry" }
//    }
// }
```

### Aliasing dynamic keys

Dynamic keys can be aliased like any other key by passing an object and adding an `aliasedKey` property:

```javascript
Firebase.Util.join(
   new Firebase('INSTANCE/account'),
   {
      ref: new Firebase('INSTANCE/profile'),
      keyMap: {
         name: 'name',
         nick: 'nick',
         style: { ref: new Firebase('INSTANCE/styles'), aliasedKey: 'dojo' }
      }
   }
);
```

### Setting dynamic data

We can set the key for a dynamic path by using the special `.id:<field_name>` property:

```javascript
ref.update({'.id:style': 'MMA'}); // Kato the Tank Abbot!
```

By default, the data in a dynamic key is READ ONLY. Thus, it is not synced during set/update/etc ops.
To set a dynamic child's data, call .child() with the key:

```javascript
var ref = Firebase.Util.join(
   new Firebase('INSTANCE/account'),
   {
      ref: new Firebase('INSTANCE/profile'),
      keyMap: {
         name: 'name',
         nick: 'nick',
         style: new Firebase('INSTANCE/styles')
      }
   }
);

ref.child('kato/style').set({description: 'Mixed Martial Arts'});
```

<a name="limitations"></a>
# LIMITATIONS

 - The joined paths must be objects. That is, they must contain child records. The children can be primitives but at the master level, they must be objects.
 - The children at a given joined path must have consistent data keys (an occasional null value is tolerated, but they should be very consistent)
 - The root() command always returns the root for the first path provided. If you provide paths from different Firebase instances, only the first one is returned by root()
 - Does not return arrays under any circumstances (will always be represented as an object)
 - Write operations are not atomic; one path could succeed and another path fail in rare instances

<a name="troubleshooting"></a>
# Troubleshooting

## Helpful tips to isolate a problem
 - Start by reading the [limitations](#limitations) above
 - Turn on debugging by calling `Firebase.Util.logLevel(true);` (use 'info', 'log' or 'debug' to tweak verbosity)
 - Check your JavaScript console for error messages
 - Add a keyMap to every path and see if the problem resolves

## Questions and bug reports

 - Submit bugs and problems via the GitHub issue tracker: https://www.github.com/firebase/firebase-utils
 - Be sure to call `Firebase.Util.logLevel('log') and attach it to your report

<a name="api"></a>
# API

<a name="api_join"></a>
## Firebase.Util.join( path[, path...] )

`@param {Firebase|Object} path`: any number of paths to be joined, see [config](#configuration_options)

This returns a [JoinedRecord](api_joinedrecord) which will load the merged data from all the paths provided.

By default, unless `intersects` is specified in the props for a path, this returns the union (an OUTER JOIN). For example, given this data

```json
   {
      "fruit": {
         "a": "apple",
         "b": "banana"
      },
      "legume": {
         "b": "baked beans",
         "c": "chickpeas",
         "d": "dry-roasted peanuts"
      },
      "veggie": {
         "b": "broccoli",
         "d": "daikon raddish",
         "e": "elephant garlic"
      }
   }
```

Calling join with all three paths:

```javascript
Firebase.Util.union(
   new Firebase('INSTANCE/fruit'),
   new Firebase('INSTANCE/legume'),
   new Firebase('INSTANCE/veggie')
);
```

Produces this:

```javascript
  {
     a: { fruit: "apple" },
     b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" },
     c: { legume: "chickpeas" },
     d: { legume: "dry-roasted peanuts", veggie: "daikon raddish" },
     e: { veggie: "elephant garlic" }
  }
```

<a name="api_intersection"></a>
## Firebase.Util.intersection( path[, path...] )

`@param {Firebase|Object} path`: any number of paths to be joined, see [config](#configuration_options)

This returns a [JoinedRecord](api_joinedrecord) containing the intersection of the two or more paths (an INNER JOIN), so that only records existing in all paths provided are returned.

For example, given this data

```json
   {
      "fruit": {
         "a": "apple",
         "b": "banana"
      },
      "legume": {
         "b": "baked beans",
         "c": "chickpeas",
         "d": "dry-roasted peanuts"
      },
      "veggie": {
         "b": "broccoli",
         "d": "daikon raddish",
         "e": "elephant garlic"
      }
   }
```

Calling intersection with these paths:

```javascript
Firebase.Util.intersection(
    new Firebase('INSTANCE/fruit'),
    new Firebase('INSTANCE/legume'),
    new Firebase('INSTANCE/veggie')
 );
```

Produces this:

```javascript
  {
     b: { fruit:  "bannana", legume: "baked beans", veggie: "broccoli" },
  }
```

<a name="api_joinedrecord"></a>
## JoinedRecord

A wrapper on [Firebase](https://www.firebase.com/docs/javascript/firebase/index.html) containing
a reference to all the joined paths, and providing most of the normal functionality, with some minor variations:

   - **on**: callbacks receive a [JoinedSnapshot](#api_joinedsnapshot) instance
   - **once**: callbacks receive a [JoinedSnapshot](#api_joinedsnapshot) instance
   - **child**: returns a [JoinedRecord](#api_joinedrecord) instance
   - **parent**: if called from a JoinedRecord.child() reference, returns the parent JoinedRecord, otherwise throws an Error (the master joined record has multiple parents)
   - **name**: for the joined collection, returns a string containing all the merged path names, for a merged child, returns the record's id
   - **set**: see [Writing data](#writing_data)
   - **setWithPriority**: sets priority on all of the paths
   - **setPriority**: sets priority on all of the paths
   - **update**: see [Writing data](#writing_data)
   - **remove**: removes records from all the joined paths
   - **root**: always returns the root of the first path, even if they point to different Firebase instances
   - **limit**: <span style="color:red">throws an Error</span>
   - **endAt**: <span style="color:red">throws an Error</span>
   - **startAt**: <span style="color:red">throws an Error</span>
   - **push**: see [Writing data](#writing_data)
   - **toString**: returns a string containing all the path urls
   - **transaction**: <span style="color:red">throws an Error</span>
   - **onDisconnect**:  <span style="color:red">throws an Error</span>

<a name="api_joinedsnapshot"></a>
## JoinedSnapshot

A wrapper on [DataSnapshot](https://www.firebase.com/docs/javascript/datasnapshot/index.html) containing
data from all the joined paths, and providing most of the normal snapshot functionality with these minor variations:

   - **child**: returns a Snapshot or JoinedSnapshot as appropriate
   - **name**: returns an array of path names or the record id as appropriate
   - **ref**: returns a [JoinedRecord](#api_joinedrecord) instance
   - **getPriority**: returns the priority of the first path (or if a sortBy is set, for this path)
   - **exportVal**: returns the merged values by calling exportVal() on each path ref and extending the previous results (dynamic paths are excluded)

<a name="contributing"></a>
