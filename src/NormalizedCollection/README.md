
# NormalizedCollection

THIS IS A BETA FEATURE. NOT RECOMMENDED FOR USE IN PRODUCTION.

See [LIVE EXAMPLES](http://firebase.github.io/firebase-util/#/toolbox/NormalizedCollection/).

## Summary

A normalized collection is a method for joining paths and data together based on keys or field
values. For example, we could join two tables with a structure like this:

```
{
  "login": {
     "user1": "kato"
  },

  "profile": {
     "user1": {
         "first": "Kato",
         "last": "Richardson"
     }
  }
}
```

Into a Firebase reference that returns this:

```
{
   "user1": {
       "login":  "kato",
       "first":  "Kato",
       "last":   "Richardson"
   }
}
```

## Usage

A normalized collection wraps Firebase references and provides the same API. It can be used
almost anywhere a regular Firebase reference would be appropriate.

```
// create a Firebase reference
var fb = new Firebase('https://<instance>.firebaseio.com');

// map the paths we are going to join
var norm = new Firebase.util.NormalizedCollection(
   fb.child('login'),
   fb.child('profile')
);

// specify the fields for each path
norm = norm.select( {key: 'login.$value', alias: 'login'}, 'profile.first', 'profile.last' );

// apply a client-side filter to the data (only return users where key === 'user1'
norm = norm.filter(
    function(data, key, priority) { return key === 'user1'; }
);

// get a reference we can use like a normal Firebase instance
ref = norm.ref();

// run it and see what we get
ref.on('value', function(snap) {
   console.log('user1 updated!', snap.val());
});
```

### Specifying the paths to join

The paths to be joined are specified in the constructor. They can be Firebase references (including
other NormalizedRefs). The paths to be joined do not need to be for the same Firebase instance/URL.

Each path needs to have a unique key, or to have an alias. The alias or key name are used to refer
to the paths while selecting fields. To specify an alias for a path, pass an array in place of the
ref as follows: `[firebaseRef, alias, optionalDependency]`

Join paths using aliases:

```
var norm = new Firebase.util.NormalizedCollection(
   new Firebase('https://kato.firebaseio.com/widgets'),                  // alias is "widgets"
   [ new Firebase('https://kato1.firebaseio.com/widgets'), 'widgets1' ], // alias is "widgets1"
   [ new Firebase('https://kato2.firebaseio.com/widgets'), 'widgets2' ], // alias is "widgets2"
);
```

**Some important assumptions**

Assumptions on data structure: A NormalizedCollection assumes that every path specified contains
key/value data (i.e. objects) and that these objects represent records to be joined.
It assumes that the paths will have the same keys (with some exceptions; see specifying
field dependencies).

Assumptions on security: Due to the way the NormalizedCollection accesses data, it must be able
to read the entire master index (first path provided). You should authenticate the master ref
before creating your NormalizedCollection.

The other paths will not be iterated, so this is safe to use even if only child records
specified in the master index can be read/written.

### The master index

The first path specified is considered the *master index*. This is fetched before any of the
other path data and used as an index for the other records. Only items in the master index
will appear in the normalized data, and this path is also used to sort the data.

NormalizedCollection assumes that the other paths will contain the same unique keys as the master
index and uses these to join the paths together. It is also possible to specify more dynamic
dependencies between paths and we'll talk about that below.

```
var fb = new Firebase('https://kato.firebaseio.com');
var norm = new Firebase.util.NormalizedCollection(
    fb.child('master'),  // the master index
    fb.child('path1'),   // a merged path with the same keys as master
    fb.child('path2')    // another merged path with the same keys
);
```

### Creating a field map (the select() function)

Once we have defined some paths we want to merge, the next step is to map the fields that we want
to read and write to. Since Firebase is a schema-less database, this is necessary to help us resolve
where data goes during set/update operations.

Fields can be specified using a string in the format `pathAlias.fieldKey`. Each fieldKey must be
unique across all the paths. Fields can also be aliased by using the
format: `{key: 'pathAlias.fieldKey', alias: 'fieldAlias'}`

```
norm = norm.select(
   'path1.field1',
   'path1.field2',
   {key: 'path2.field1', alias: 'foo'},
   {key: 'path2.field2', alias: 'bar'}
);

// produces this key/value structure in the normalized results:
// {
//   mergedRecord: {
//      field1: <value>,
//      field2: <value>,
//      foo: <value>,
//      bar: <value>
//   }
// }
```

### Using filter()

Filters are a client-side tool for controlling what data triggers local events. (For server-side
filtering, try applying [a query](https://www.firebase.com/docs/web/guide/retrieving-data.html#section-queries)
to your master index). It is a simple function that returns true or false for each record received.

The data passed into the query will be aliased using the field aliases, and will contain all data
available from all of the paths specified.

```
// filter the client-side results to only include records where first_name matches 'James'
norm = norm.filter(function(data, key, priority) {
   return data.first_name === 'James';
});
```

### Writing data

It's possible to write to the merged records as well using `push()`, `set()`, `update()`, and
`remove()`. Only fields that are in the map will be modified when doing a set or update operation,
so if other data exists in the record which is not part of the field map, it will be left alone.

Calling `remove()`, on the other hand, will delete the spefified keys and all child keys, even if they are
not in the path. When using `push()`, it creates the unique id in each path specified and then
 saves the appropriate fields.

This example sets `https://<instance>.firebaseio.com/path1/$pushid/foo` and
`https://<instance>.firebaseio.com/path2/$pushid/bar` in a single push operation:

```
var fb = new Firebase('https://<instance>.firebaseio.com');
var ref = new Firebase.util.NormalizedCollection(fb.child('path1'), fb.child('path2'))
    .select('path1.foo', 'path2.bar')
    .ref();

ref.push({ foo: 'foo value', bar: 'bar value' });
```

### Specifying field dependencies

Records are normally joined by linking their path key to the master index's keys. You can specify
other fields as the linking mechanism by adding a dependency to the path definition. For example,
considering the following chat data:

```
{
   "messages": {
       "message1": {
          "text": "Hello world!",
          "user": "kato"
       }
   },

   "users": {
       "kato": {
          "name": "Kato the Transmogrified"
       }
   }
}
```

We could merge these records together using a field dependency as follows:

```
var fb = new Firebase('https://<instance>.fireabseio.com');
var norm = new Firebase.util.NormalizedRecord(
   fb.child('messages'),
   [fb.child('users'), 'users', 'messages.user']
);

var ref = norm.select('messages.text', 'messages.user', 'users.name').ref();
```

Now the joined records would look like this:

```
{
   "message1": {
       "text": "Hello world!",
       "user": "kato",
       "name": "Kato the Transmogrified"
   }
}
```

**Some important notes about dependencies!**

The field that contains the dependency (in this case, `messages.user`) must exist in the select()
criteria. It can be set normally (which would change the linked user/ record and therefore change
the name included. The value of `name` can also be modified, which will be changed in the user record.

Keep in mind that `messages.user` is in the format `pathAlias.fieldKey`. This can be slightly confusing
until you realize that we might have multiple paths with the same key, so we need to use pathAlias
here, but we also haven't defined the fields yet, so we can't refer to those by alias, so it must
be the fieldKey.

## API

### NormalizedCollection

A NormalizedCollection is used to create a map of paths and fields to the final data we want
to fetch. Once a NormalizedCollection is complete, we call ref() to finalize it and to create
the actual ref we will use to synchronized data.

#### NormalizedCollection(path, [path...])

    @param {Firebase|Array} `path`: A reference to normalize, or an array containing `[ref, optionalAlias, optionalDependency]`
    @constructor

Create a new normalized collection and specify the paths that are going to be merged. Each path
must have a unique key or a unique alias specified.

Normally, the paths are joined using the keys. However, it is possible to join paths using the
value of a child field in another path by specifying a dependency. The dependency is a string
in the format `pathAlias.fieldKey`. The field's value must match the key in the dependent path.

#### select(field, [field...])

    @param {String|Object} `field`: A field key in the format `pathAlias.fieldKey` or an object in the format `{key: 'pathAlias.fieldKey', alias: 'nameForTheField'}`
    @returns NormalizedCollection

Specifies the fields that will appear in data and which paths they should be extracted from. This
is also used by set() and update() ops to determine which fields are modified in the
data (fields not in the map will be left alone, even if they are not in the new data).

#### filter(iterator)

    @param {Function} `iterator`: a function that returns `true` or `false`
    @returns NormalizedCollection

A client-side tool to filter the data that triggers events (e.g. `value`, `child_added`, etc).
This does not affect write operations, only local records.

#### ref()

    @returns {NormalizedRef} see below

Returns a NormalizedRef that will merge data according to the paths,
fields, and filter provided.

### NormalizedRef

A NormalizedRef is obtained from NormalizedCollection.prototype.ref(). It can be used like a
normal Firebase ref and implements the standard [Firebase API](https://www.firebase.com/docs/web/api/)
with the caveats/exceptions listed below.

Unless otherwise noted, all methods that would normally return a Firebase instance will return
a NormalizedRef.

#### Query methods

All query methods (e.g. `orderByChild()`, `orderByKey()`, `limitToFirst()`, et al) are applied to
the master index (the first path specified in the constructor).

#### Authentication methods

All authentication methods (e.g. `authWithPassword()`, `createUser()`, et al) are applied to the
master index (the first path specified in the constructor).

#### on(event, callback, [cancel], [context])

    @returns {NormalizedRef}

All child events and value events are triggered any time data changes in any of the given paths.
Initial `value` and `child_added` events will wait until all the paths have loaded.

Internally, as soon as the first listener is attached to a NormalizedCollection, it begins
 monitoring the master index (first path) for `child_added` events. It then establishes
 a `value` listener on each path for each child record that is added.

It monitors the master index for `child_moved`, `child_changed`, and `child_removed` events and
triggers those accordingly with the merged values. A `child_removed` event will remove all `value`
listeners for that child as well and delete locally cached data.

It monitors all the paths for a given record for any `value` event and triggers that event accordingly
with the merged values.

#### once(event, callback, [cancel], [context])

    @returns {NormalizedRef}

This probably only makes sense with `value`.

#### off(event, callback, [context])

    @returns {NormalizedRef}

If there are no listeners left, the NormalizedCollection will delete all locally cached data and
remove all `value` listeners on each individual child record.

#### child(key)

    @returns {NormalizedRef}

Calling child on the master ref for a normalized collection will return a single merged record.

Calling child again on a merged record returns what is essentially a normal
Firebase reference for a child of one path. The path to use will be determined by
the field map. If a key is given that doesn't match a field alias, then that key is returned
as a child of the master index.

```
var ref1 = new Firebase('https://kato1.firebaseio.com/foo');
var ref2 = new Firebase('https://kato2.firebaseio.com/bar');
var ref3 = new Firebase('https://kato3.firebaseio.com/baz');

var ref = new Firebase.util.NormalizedCollection(ref1, ref2, ref3)
    .select('foo.name', 'bar.color', 'baz.size')
    .ref();

ref.child('record1').child('name'); // https://kato1.firebaseio.com/foo/record1/name
```

#### parent()

    @returns {NormalizedRef|null}

A NormalizedCollection is considered the root node. Calling parent() on this returns null (just
as if you called parent on a root Firebase node). The normal child/parent chain works below this
level.

```
var ref1 = new Firebase('https://kato1.firebaseio.com/foo');
var ref2 = new Firebase('https://kato2.firebaseio.com/bar');
var ref3 = new Firebase('https://kato3.firebaseio.com/baz');

var ref = new Firebase.util.NormalizedCollection(ref1, ref2, ref3)
    .select('foo.name', 'bar.color', 'baz.size')
    .ref();

ref.parent(); // null

// https://kato1.firebaseio.com/foo/record1/name
var childRef = ref.child('record1').child('name');

// merged record for foo/record1 + bar/record1 + baz/record1
childRef.parent();

childRef.parent().parent() === ref; // true!
childRef.parent().parent().parent() === null; // true!
```

#### name()

    @returns {string}

The name for a merged ref with more than one path is the concatenated list of aliases. The name for
a single path is the alias for that path.

```
var ref1 = new Firebase('https://kato1.firebaseio.com/foo');
var ref2 = new Firebase('https://kato2.firebaseio.com/bar');

var ref = new Firebase.util.NormalizedCollection(ref1, [ref2, 'refTheTwo'])
    .select('foo.name', 'bar.color')
    .ref();

ref.key(); // "[foo][refTheTwo]" (a merged collection)

ref.child('record1').key(); // "[record1][record1]" (a merged record)

ref.child('record1/name').key(); // "name"
```

#### toString()

    @returns {string}

The toString() for a merged ref is the concatenated list or URLs. If there is exactly one path,
then toString() will just return that URL.

```
var ref1 = new Firebase('https://kato1.firebaseio.com/foo');
var ref2 = new Firebase('https://kato2.firebaseio.com/bar');

var ref = new Firebase.util.NormalizedCollection(ref1, [ref2, 'refTheTwo'])
    .select('foo.name', 'bar.color')
    .ref();

// "[https://kato1.firebaseio.com/foo][https://kato2.firebaseio.com/bar]" (a merged collection)
ref.toString();

// "[https://kato1.firebaseio.com/foo/record1][https://kato2.firebaseio.com/bar]" (a merged record)
ref.child('record1').toString();

// https://kato1.firebaseio.com/foo/record1/name
ref.child('record1/name').key();
```

#### transaction()

Not support yet; throws an error.

#### onDisconnect()

Not supported yet; throws an error.

#### goOnline()

Called on all the paths specified.

#### goOffline()

Called on all the paths specified.

### NormalizedSnapshot

A wrapper on the standard DataSnapshot object in Firebase. Supports all the snapshot methods.

The data contained in the snapshot is the merged result of all the paths specified, and the key/value
pairs are aliased using the field map. Records are ordered according to the master index's sorting
criteria.
