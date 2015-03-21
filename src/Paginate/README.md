
THIS IS A BETA FEATURE. NOT RECOMMENDED FOR USE IN PRODUCTION.

See [LIVE EXAMPLES](http://firebase.github.io/firebase-util/toolbox/Paginate/).

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

[Integrating with ionic-infinite-scroll](https://gist.github.com/katowulf/7adb5775dce44cbbba0a)
[Integrating with ngInfiniteScroll](https://gist.github.com/katowulf/dd354f1f236e3086f61f)
[Integrating with ui-grid](https://gist.github.com/katowulf/c74b6e2d047c9e2eaaa9)

# API

## Scroll

### Firebase.util.Scroll(ref, orderByField [, opts]);

    @param {Firebase} ref
    @param {string} orderByField
    @param {object} [opts]

This class creates an infinite scroll reference such that, whenever next() or prev() are called, appropriate
`child_added` events will be triggered. If `windowSize` is exceeded, then records are trimmed from the opposite
end of the list by triggering `child_removed` events for those items. In this way, we can ensure the list will
always fit in memory by dropping items that have disappeared from the far end of the view.

The reference returned will have a special `scroll` namespace where all the API methods for Scroll can be found. For
example:

```
var baseRef = new Firebase(...);
var scrollRef = new Firebase.util.Scroll(baseRef, '$key');
// special scroll methods are namespaced in scrollRef.scroll
scrollRef.scroll.next(25);
```

The `orderByField` is used with [Firebase queries](https://www.firebase.com/docs/web/guide/retrieving-data.html#section-queries)
to order the paginated data. Valid values are:
 - `$key` for [orderByKey()](https://www.firebase.com/docs/web/api/query/orderbykey.html)
 - `$priority` for [orderByPriority()](https://www.firebase.com/docs/web/api/query/orderbypriority.html)
 - `$value` to use [orderByValue()](https://www.firebase.com/docs/web/api/query/orderbyvalue.html)
 - any other string to use [orderByChild()](https://www.firebase.com/docs/web/api/query/orderbychild.html).

Keys/values that can be passed via `opts`:
  - {int} `windowSize`: the maximum number of records to have loaded in the list at any given time. 3-5 times the size of the viewable window is a good optimization, depending on how fast content is scrolled and the payload of each record (i.e. how long it takes to download).
  - {int} `maxCacheSize`: in general, leave this as the default. This controls the internal cursor's cache, which is used to find the current position in the list. This controls
  how many keys it can load at any given time. This is, by default, three times the size of `windowSize` and should always be larger than `windowSize`.

### ref.scroll.next(numberOfRecords)

    @param {int} numberOfRecords

Append the next `numberOfRecords` to the list. This will trigger `child_added` events if any additional records
are found and loaded. They will have an appropriate `prevChild` key and should appear at the end of the list. If
 `windowSize` is exceeded, then `child_removed` events will be triggered to trim items from the beginning of the
 list.

### ref.scroll.prev(numberOfRecords)


    @param {int} numberOfRecords

Prepend `numberOfRecords` to the beginning of the list. This will trigger `child_added` events if any prior records
are found and loaded. They will have an appropriate `prevChild` key and should appear at the beginning of the list,
with the first item having `null` for prevChild. If `windowSize` is exceeded, then `child_removed` events will be
triggered to trim items from the end of the list.

### ref.scroll.hasNext()

   @returns {boolean}

Returns true if additional records exist beyond what is currently loaded. In the case where we are unsure (i.e. if
no records have ever been retrieved yet or if we are still loading the current set) this will return true until
the current load is completed. For an asynchronous version of this method, use `observeHasNext`

### ref.scroll.hasPrev()

   @returns {boolean}

Returns true if any records exist before the ones that are currently being displayed. This occurs when we scroll far
enough to exceed `windowSize` and therefore will be able to call prev() to move back up to those prior records we've
unloaded from memory.

### ref.scroll.observeHasNext(callback [, context]);

   @param {Function} `callback` called whenever hasNext() changes
   @param {object} `[context]` sets the `this` scope inside of callback

Invoked whenever the `hasNext()` status changes. Since we only load enough records to see if there is anything beyond
the currently viewed items, we won't know where the end is until we reach the end of the records. This can be useful
for showing when the end of the list has been reached and for updating the status if additional records are appended
later.

### ref.scroll.destroy()

Calls `child_removed` event for any records currently being displayed, removes all event listeners, and frees
memory and references for the infinite scroll reference.

## Paginate

## Firebase.util.Paginate( ref, orderByField [, opts] );


    @param {Firebase} ref
    @param {string} orderByField
    @param {object} [opts]

This class creates a paginating reference such that, whenever next() or prev() are called, appropriate
`child_added` and `child_removed` events will be triggered so that the new pages content is shown and the old
page's content is removed.

The reference returned will have a special `page` namespace where all the API methods for Paginate can be found. For
example:

```
var baseRef = new Firebase(...);
var scrollRef = new Firebase.util.Paginate(baseRef, '$key');
// special paginate methods are namespaced in scrollRef.page
scrollRef.page.next();
```

The `orderByField` is used with [Firebase queries](https://www.firebase.com/docs/web/guide/retrieving-data.html#section-queries)
to order the paginated data. Valid values are:
 - `$key` for [orderByKey()](https://www.firebase.com/docs/web/api/query/orderbykey.html)
 - `$priority` for [orderByPriority()](https://www.firebase.com/docs/web/api/query/orderbypriority.html)
 - `$value` to use [orderByValue()](https://www.firebase.com/docs/web/api/query/orderbyvalue.html)
 - any other string to use [orderByChild()](https://www.firebase.com/docs/web/api/query/orderbychild.html).

Keys/values that can be passed via `opts`:
  - {int} `pageSize`: the number of records to load on each page
  - {int} `maxCacheSize`: in general, leave this as the default. This controls the internal cursor's cache, which is used to find the current position in the list. This controls
  how many keys it can load at any given time. This is, by default, three times the size of `windowSize` and should always be larger than `windowSize`.

### ref.page.next()

Append the next `pageSize` records by triggering `child_added` events for each item. Then trigger `child_removed` for
items in any other page loaded before next() was called. The `onPageChange()` method can be used to observe any
next()/prev() calls that successfully load new content.

### ref.page.prev()

Append the previous `pageSize` records by triggering `child_added` events for each item. Then trigger `child_removed` for
items in any other page loaded before prev() was called. The `onPageChange()` method can be used to observe any
next()/prev() calls that successfully load new content.

### ref.page.hasNext()

   @returns {boolean}

Returns true if additional records exist beyond what is currently loaded. In the case where we are unsure (i.e. if
no records have ever been retrieved or if we are still loading the current set) this will return true until
the current load is completed. For an asynchronous version of this method, use onPageCount()

### ref.page.hasPrev()

   @returns {boolean}

Returns true if additional records exist before the current page. This will be true whenever the page count is
greater than one and the current page in view is greater than one.

### ref.page.onPageChange(callback [, context]);

   @param {function} callback
   @param {object} [context]

Invoked whenever next() or prev() are called successfully (i.e. there is next/prev content to be displayed). The
method is invoked with an `int` representing the currently loaded page number.

### ref.page.onPageCount(callback [, context]);

   @param {function} callback
   @param {object} [context]

Invoked whenever we determine there are more records available and the potential page count has increased. The page
count may not be certain if there are more records than `maxCacheSize` and we haven't advanced enough pages to find
the last record yet.

The callback is triggered with two arguments: an integer representing the current page count, and a boolean that
tells whether there could be more pages (because we haven't found the end yet).

```
var ref = new Firebase.util.Page(ref, 'name', {pageSize: 10});
ref.page.onPageCount(function(currentPageCount, couldHaveMore) {
   console.log('There are ' + currentPageCount + ' pages' + (couldHaveMore? ' or more' : ''));
});
```

### ref.page.getCountByDownloadingAllKeys([callback] [, context])

   @param {function} [callback]
   @param {object} [context]

One authoritative way to fetch the page count is to retrieve all the keys for the current path. Note that this is
still approximate, since additional records could be added after the call is invoked. However, it provides a mostly
accurate count of pages.

Using this on a path containing millions of records could have performance implications, since all the keys have to
be loaded into memory at the same time. This is best utilized on shorter lists containing thousands or less records.

### ref.page.destroy()

Calls `child_removed` event for any records currently being displayed, removes all event listeners, and frees
memory and references for the paginate reference.

## ReadOnlyRef

Most of the methods on ReadOnlyRef simply return the same result as they would if called on
the original ref object. For example

### Unsupported methods (throws an error if called)

`set`, `update`, `remove`, `push`, `setWithPriority`, `setPriority`, `transaction`, `limit`,
`onDisconnect`, `orderByChild`, `orderByKey`, `orderByPriority`, `limitToFirst`, `limitToLast`,
`startAt`, `endAt`, `equalTo`

Note that while these methods are not supported on the paginated or scrolled references, they will
work on any child nodes obtained using `.child()`.

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