(function(exports, fb) {
   var join = fb.package('join');

   function JoinedRecord() {
      this.joinedParent = null;
      this.paths = [];
      this.firstRef = null;
      this.primarySort = null;
      this.loadedChildRecs = {};
      this.sortedChildKeys = [];
      this.observers = { child_added: [], child_removed: [], child_changed: [], child_moved: [], value: [] };
      this._loadPaths(fb.util.toArray(arguments));
   }

   JoinedRecord.prototype = {
      auth: function(authToken, onComplete, onCancel) {
         return this.firstRef.auth(authToken, onComplete, onCancel);
      },

      unauth: function() {
         return this.firstRef.unauth();
      },

      on: function(eventType, callback, cancelCallback, context) {
         var obs = new join.Observer(eventType, callback, cancelCallback, context);
         this.observers[eventType].push(obs);
         if( eventType === 'value' ) {
            this._notifyWhenLoaded('value', obs);
         }
         else if( eventType === 'child_added' && this.sortedChildKeys.length ) {
            var prev = null;
            fb.util.each(this.sortedChildKeys, function(key) {
               var rec = this.loadedChildRecs[key];
               rec._notifyWhenLoaded(eventType, obs, prev);
               prev = rec;
            }, this);
            if( this.observers[eventType].length === 1 ) {
               this._initialize(eventType);
            }
         }
      },

      off: function(eventType, callback, context) {
         if( !eventType ) {
            fb.util.each(fb.util.keys(this.observers), function(key) {
               this.off(key, callback, context);
            }, this);
         }
         else {
            var removes = [];
            var obs = this.observers[eventType];
            fb.util.each(obs, function(obs, i) {
               if( obs.matches(eventType, callback, context) ) {
                  obs.dispose();
                  removes.push(i);
               }
            });
            fb.util.each(removes.reverse(), function(i) {
               obs.splice(i, 1);
            }, this);
            if( obs.length === 0 ) {
               this._unititialize(eventType);
            }
         }
         return this;
      },

      once: function(eventType, callback, failureCallback, context) {},

      child: function(childPath) {
         var test, ref;
         var parts = childPath.split('/'), firstPart = parts.shift();
         test = this.loadedChildRecs[firstPart];
         if( test ) {
            // I already have this child record loaded so just return it
            ref = test;
         }
         else if( this.joinedParent ) {
            // if this is the child of a join path, then its children are just regular Firebase refs
            // so we can just try to find the correct source for the key and call child() on that ref
            test = fb.util.find(this.paths, function(path) {
               return path.hasKey(firstPart);
            });
            if( test ) {
               ref = test.child(firstPart);
            }
            else {
               fb.log.warn('Key "%s" not found in any of my joined paths (is it in your keyMap?); I am returning a child ref from the first joined path, which may not be what you wanted', firstPart);
               ref = this.firstRef.child(firstPart);
            }
         }
         else {
            // this is the joined parent, so we fetch a JoinedRecord as the child
            // this constructor syntax is for internal use only and not documented in the API
            ref = new JoinedRecord(this, firstPart);
         }

         // we've only processed the first bit of the child path, so if there are more, fetch them here
         return parts.length? ref.child(parts.join('/')) : ref;
      },

      parent:          function() {
         return this.joinedParent || this.firstRef.parent();
      },

      name: function() {
         return this.joinedParent? this.firstRef.name() : '['+fb.util.map(this.paths, function(p) { return p.name(); }).join('][')+']';
      },

      set:             function(value, onComplete) {},
      setWithPriority: function(value, priority, onComplete) {},
      setPriority:     function(priority, onComplete) {},
      update:          function(value, onComplete) {},
      remove:          function(onComplete) {},
      push:            function(value, onComplete) {},
      root:            function() { return this.firstRef.root(); },

      toString: function() { return '['+fb.util.map(this.paths, function(p) { return p.toString(); }).join('][')+']'; },

      ref:             function() { return this; },

      //////// methods that are not allowed
      onDisconnect:    function() { throw new Error('onDisconnect() not supported on JoinedRecord'); },
      limit:           function() { throw new Error('limit not supported on JoinedRecord; try calling limit() on ref before passing into Firebase.Util'); },
      endAt:           function() { throw new Error('endAt not supported on JoinedRecord; try calling endAt() on ref before passing into Firebase.Util'); },
      startAt:         function() { throw new Error('startAt not supported on JoinedRecord; try calling startAt() on ref before passing into Firebase.Util.join'); },
      transaction:     function() { throw new Error('transactions not supported on JoinedRecord'); },

      _initialize: function(event) {
         fb.util.each(this.paths, function(p) {
            p.on(event);
         });
      },

      _unititialize: function(event) {
         fb.util.each(this.paths, function(p) {
            p.off(event);
         });
      },

      // this should never be called by a dynamic path, only by primary paths
      // that are controlling when a record gets created and processed
      _pathEvent: function(path, event, snap, prevChild) {
         fb.log.debug('_pathEvent', event, path.toString(), snap.name(), path.getKeyMap());//debug

         if( event !== 'value' && hasAnyObservers(this.observers) ) {
            join.buildSnapshot(this.child(snap.name()), function(joinedSnap) {
               //todo
               //todo It may be necessary to transform child events because the combined
               //todo result may differ. For example, if a child rec already exists because
               //todo another union path created it, it's now a child_changed instead of added
               //todo or if a single path in a union is removed, it's a child_changed instead
               //todo of a remove, so address these cases individually
               //todo
               this._notifyAll(event, joinedSnap, prevChild);
            }, this);
         }

         if( this.observers['value'].length ) {
            join.buildSnapshot(this, function(joinedSnap) {
               this._notifyAll('value', joinedSnap);
            }, this);
         }
      },

      _loadPaths: function(paths) {
         // used for inheritance when calling child() on a JoinedRecord
         if( paths[0] instanceof JoinedRecord && paths.length === 2 ) {
            this.joinedParent = paths[0];
            fb.util.each(this.joinedParent.paths, function(parentPath) {
               // the child paths are merged as a union which is very appropriate
               // for a child of the joined path where we'll want all the data, and not a subset
               this._addPath(parentPath.childPath(this, paths[1]));
            }, this);
         }
         else {
            fb.util.each(paths, this._addPath, this);
         }
         if( !this.firstRef ) {
            throw new Error('No valid Firebase refs provided (must provide at least one actual ref (i.e. non-function) argument');
         }
      },

      _notifyWhenLoaded: function(event, observers, prev) {
         if( !fb.util.isArray(observers) ) { observers = [observers]; }

         // start loading the snapshot right away
         var builder = join.buildSnapshot(this);
         var prevName = prev;

         function notifyAll(snap) {
            fb.util.each(observers, function(obs) {
               obs.notify(snap, prevName);
            });
         }

         // if we're loading several records, wait for the prev record
         // to do it's magic before we send our notifications (so they
         // are sent in the same order Firebase would have sent them)
         if( prev instanceof JoinedRecord ) {
            prevName = prev.name();
            prev._whenLoaded(function() {
               builder.value(notifyAll);
            });
         }
         else {
            builder.value(notifyAll);
         }
      },

      _notifyAll: function(event, snap, prevName) {
         fb.util.each(this.observers[event], function(obs) {
            obs.notify(snap, prevName);
         });
      },

      _addPath: function(pathProps) {
         var path = new join.Path(pathProps, this);
         this.paths.push(path);
         if(!this.primarySort && path.isSortBy()) {
            this.primarySort = path;
         }
         if(!this.firstRef && path.ref()) {
            this.firstRef = path.ref();
         }
      },

      _addChildRec: function(rec, prevChild) {
         //todo
         //todo
         //todo
         //todo
         //todo
      },

      _removeChildRec: function(rec) {
         var i = fb.util.indexOf(this.sortedChildKeys, rec.name());
         if( i > -1 ) {
            this.sortedChildKeys.splice(i, 1);
         }
         delete this.loadedChildRecs[rec.name()];
      }
   };

   function hasAnyObservers(obs) {
      return fb.util.find(obs, function(list) { return list.length > 0; }) !== undefined;
   }

   /** add JoinedRecord to package
     ***************************************************/
   join.JoinedRecord = JoinedRecord;

})(exports, fb);
