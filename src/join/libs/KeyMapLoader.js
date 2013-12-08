(function (fb) {
   "use strict";
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function KeyMapLoader(path, parent) {
      this.queue = util.createQueue();
      this.keyMap = null;
      this.isReadOnly = false;
      this.dynamicChildPaths = {};
      var km = path.getKeyMap();
      if( util.isEmpty(km) ) {
         if( parent ) {
            this._loadKeyMapFromParent(parent);
         }
         else {
            this._loadKeyMapFromData(path);
         }
      }
      else {
         this._parseRawKeymap(km);
      }
   }

   KeyMapLoader.prototype = {
      done: function(callback, context) {
         //todo does not handle failure (security error reading keyMap)
         this.queue.done(function() {
            callback.call(context, this.isReadOnly, this.keyMap, this.dynamicChildPaths);
         }, this);
      },

      fail: function(callback, context) {
         this.queue.fail(callback, context);
      },

      _parseRawKeymap: function(km) {
         var dynamicPaths = {};
         var finalKeyMap = {};
         util.each(km, function(v, k) {
            if( util.isObject(v) ) {
               var toKey = k;
               if( v instanceof util.Firebase || v instanceof join.JoinedRecord ) {
                  v = { ref: v };
               }
               else if(v.aliasedKey) {
                  toKey = v.aliasedKey;
               }
               v.keyMap = {'.value': toKey};
               finalKeyMap[k] = toKey;
               dynamicPaths[k] = new join.Path(v);
            }
            else if( v === true ) {
               finalKeyMap[k] = k;
            }
            else {
               finalKeyMap[k] = v;
            }
         });
         if( !util.isEmpty(dynamicPaths) ) { this.dynamicChildPaths = dynamicPaths; }
         if( !util.isEmpty(finalKeyMap) ) { this.keyMap = finalKeyMap; }
      },

      _loadKeyMapFromParent: function(parent) {
         this.queue.addCriteria(function(cb) {
            parent.observeOnce('keyMapLoaded', function(keyMap) {
               if( parent.isJoinedChild() ) {
                  this.keyMap = { '.value': '.value' };
               }
               else {
                  this.keyMap = util.extend({}, keyMap);
               }
               cb();
            }, this);
         }, this);
      },

      _loadKeyMapFromData: function(path) {
         this.queue.addCriteria(function(cb) {
            // sample several records (but not hundreds) and load the keys from each so
            // we get an accurate union of the fields in the child data; they are supposed
            // to be consistent, but some could have null values for various reasons,
            // so this should help avoid inconsistent keys
            path.ref().limit(25).once('value', function(samplingSnap) {
               var km = {};
               if( util.isObject(samplingSnap.val()) ) {
                  var keys = [];
                  // we sample several records and look for keys so if a key is missing from one or two
                  // we don't get funky and skewed results (we hope)
                  samplingSnap.forEach(function(snap) {
                     keys.push(snap.name());
                     if( util.isObject(snap.val()) ) {
                        // got an object, add an keys in that object to our map
                        util.each(snap.val(), function(v, k) { km[k] = k; });
                        return false;
                     }
                     else if( !util.isEmpty(snap.val()) ) {
                        // got a primitive, so the only key is .value and we cancel iterations
                        km = { '.value': path.ref().name() };
                        return true;
                     }
                     else {
                        return false;
                     }
                  });
                  log.info('Loaded keyMap for Path(%s) from child records "%s": %j', path.toString(), keys, km);
               }
               if( util.isEmpty(km) ) {
                  this.isReadOnly = true;
                  km['.value'] = path.ref().name();
               }
               this.keyMap = km;
               cb();
            }, function(err) {
               log.error(err);
               cb(err);
            }, this);
         }, this);
      }
   };

   join.getKeyMapLoader = function(path, parent) {
      return new KeyMapLoader(path, parent);
   }

})(fb);