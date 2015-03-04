
# Summary

The Paginate library currently contains tools for pagination (next page, previous page, and skip
to page by number) and infinite scroll (continue appending records as the page is scrolled down).

These tools work by returning a read-only reference which can be used like any other Firebase
ref. When the page/scroll is advanced, `child_added` and `child_removed` events will be triggered
to change the viewable record set. When items are modified and in the viewable range,
`child_changed` events are triggered.

While one cannot call `remove()`, `set()`, or other write events directly on the ref, it is
possible to use `child()` and the references returned there are full Firebase refs with write
capabilities.

# Usage

## Scroll Usage

```js
// create a Firebase ref that points to the scrollable data
var baseRef = new Firebase('https://fbutil.firebaseio.com/paginate');

// create a read-only scroll ref, we pass in the baseRef and a field that
// will be used in the orderByChild() criteria (this also accepts $key, $priority, and $value)
var scrollRef = new Firebase.util.Scroll(baseRef, 'number');

// establish an event listener as you would for any Firebase ref
scrollRef.on('child_added', function(snap) {
   console.log('added child', snap.key());
});

// download the first 20 records
scrollRef.scroll.next(20);
```

## Paginate Usage

```js
// create a Firebase ref that points to the paged data
var baseRef = new Firebase('https://fbutil.firebaseio.com/paginate');

// create a read-only paginate ref, we pass in the baseRef and the field that
// will be used in the orderByChild() criteria (this also accepts $key, $priority, and $value)
// an optional third argument can be used to specify the number of items per page
var pageRef = new Firebase.util.Paginate(fb, 'number', {pageSize: 10});

// listen for changes to the data as you would on any Firebase ref
pageRef.on('child_added', function(snap) {
   console.log('record added', snap.key());
});

// discard any currently loaded records (calls child_removed)
// and then load the next page of records (calls child_added)
pageRef.page.next();
```

# Examples

## Integrating with ngInfiniteScroll

## Integrating with ui-grid

## Integrating with ionic-infinite-scroll

# API

## Scroll

### Firebase.util.Scroll(ref, orderByField [, opts]);

### ref.scroll.next(numberOfRecords)

### ref.scroll.prev(numberOfRecords)

### ref.scroll.hasNext()

### ref.scroll.hasPrev()

### ref.scroll.observeHasNext(callback [, context]);

### ref.scroll.destroy()

## Paginate

## Firebase.util.Paginate( ref, orderByField [, opts] );

### ref.page.next()

### ref.page.prev()

### ref.page.hasNext()

### ref.page.hasPrev()

### ref.page.onPageChange(callback [, context]);

### ref.page.onPageCount(callback [, context]);

### ref.page.getCountByDownloadingAllKeys(callback [, context])

### ref.page.destroy()


## ReadOnlyRef

Most of the methods on ReadOnlyRef simply return the same result as they would if called on
the original ref object. For example

### Unsupported methods (throws an error if called)

`set`, `update`, `remove`, `push`, `setWithPriority`, `setPriority`, `transaction`, `limit`,
`onDisconnect`, `orderByChild`, `orderByKey`, `orderByPriority`, `limitToFirst`, `limitToLast`,
`startAt`, `endAt`, `equalTo`

### Wrapped methods with special behaviors

#### on(eventName, callback [, cancelCallback] [, context])

Behaves, for the most part, exactly like a regular on() callback. However, this is only triggered
for items which are within the viewable scope. When items move into the viewable range,
they trigger `child_added` events. When they move out of the viewable range, they trigger
`child_removed` events:

```
var ref = new Firebase.util.Paginate(
    new Firebase('https://fbutil.firebaseio.com/paginate'),
    'number',
    {pageSize: 3}
);

ref.on('child_added', function(snap) {
   console.log('added', snap.key());
}};
ref.on('child_removed', function(snap) {
   console.log('removed', snap.key());
}};

ref.page.next();
// added rec1
// added rec2
// added rec3

ref.page.next();
// added rec4
// added rec5
// added rec6
// removed rec1
// removed rec2
// removed rec3

ref.page.prev()
// added rec1
// added rec2
// added rec3
// removed rec4
// removed rec5
// removed rec6
```

#### once(eventName, callback [, context])

Works in the same manner as regular once() callbacks, but only triggers for events within
the current viewable scope (items in the current page or scroll window).

#### ref()

Returns this ReadOnlyRef