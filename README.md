
# FirebaseJoin

Sync to multiple Firebase paths and seamlessly merge the data into a single object. You can use all your favorite
Firbebase methods (on, once, set, etc) normally. An instance of this class can be used anywhere a normal Firebase
reference would work, including [angularFire](http://angularfire.com/).

## Usage

### On the web:

```
<script src="http://static.firebase.com/v0/firebase.js"></script>
<script src="fbjoin.min.js"></script>

<script>
   var ref = new FirebaseJoin( new Firebase(PATH1), new Firebase(PATH2), ... );
   ref.on('child_added', function(snap) { console.log(snap.val()); });
</script>
```

### In node.js:

```
var FirebaseJoin = require('./fbjoin.js');
var ref = new FirebaseJoin( new Firebase(PATH1), new Firebase(PATH2), ... );
ref.on('child_added', function(snap) { console.log(snap.val()); });
```

### Works with Primitives

This class can accept paths that store primitives, objects, or arrays
Primitive values are stored using the path's parent name. For example:
```
   // given this data
   {
      car/123: "Ford GT",
      truck/123: "Ford F150"
   }

   // and this join
   new FirebaseJoin( new Firebase('INSTANCE/car'), new Firebase('INSTANCE/truck') );

   // the joined object would look as follows:
   { car: "Ford GT", truck: "Ford F150" }
```

Conflicting paths can be resolved by adding `dataKey` to the [configuration options](#config), to specify which
field the primitive value should be stored in.

<a name="config"></a>
### Configuration options

The `paths` elements passed to the FirebaseJoin constructor contain a Firebase ref, a function, or a hash.
The hash is structured as follows:
<ul>
   <li>{Firebase|Function} ref: (required!) ref to the parent path for this set of records</li>
   <li>{boolean}    intersects: defaults to false, if true the join will only contain records that exist in this path</li>
   <li>{string}        dataKey: specify the data key if this path contains primitive values</li>
   <li>{boolean}        sortBy: sort records by this path's ordering
   <li>{Array}          keyMap:
</ul>

To include records from a path which are not keyed by the same ID, a mapping function can be provided in place
of the Firebase ref. It will be passed a record from any intersecting path (whichever returns first) and
determines how to look up the secondary records. Note that at least one path must exist which is not mapped.

The mapping function's signature: function(recordId, parentName, snapshot) { ...returns Firebase ref to child... }

Example:
```

   // given this data structure:
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


   // we could use this join:
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


# API


# Contributing to FirebaseJoin

## Setup

If you don't have [Grunt](http://gruntjs.com/) installed, do it like so

```
npm install -g grunt
```

[Fork this project](https://help.github.com/articles/fork-a-repo) into your own GitHub repo

```
git clone https://github.com/YOURNAME/FirebaseJoin.git
cd FirebaseJoin
npm install
grunt
```

## Testing

Add test cases to cover any new code you create. Make sure all test cases pass before committing changes.

```
grunt test
```

## Committing changes

See [Using Pull Requests](https://help.github.com/articles/using-pull-requests)