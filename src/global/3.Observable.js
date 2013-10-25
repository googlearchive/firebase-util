(function (exports, fb) {
   var undefined;
   var log  = fb.pkg('log');
   var util = fb.pkg('util');

   /**
    * A simple observer model for watching events.
    * @param eventsMonitored
    * @param [opts] can contain callbacks for onAdd, onRemove, and onEvent
    * @constructor
    */
   function Observable(eventsMonitored, opts) {
      opts || (opts = {});
      this._observableProps = util.extend(
         { observers: {}, onAdd: null, onRemove: null, onEvent: null },
         opts
      );
      util.each(eventsMonitored, function(key) {
         this._observableProps.observers[key] = [];
      }, this);
   }
   Observable.prototype = {
      /**
       * @param {String|Array} event
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       * @param {Function} [cancelFn]
       */
      observe: function(event, callback, scope, cancelFn) {
         var eventList = util.isArray(event)? event : [event];
         var obs = callback instanceof util.Observer? callback : new util.Observer(event, callback, scope, cancelFn);
         util.each(eventList, function(e) {
            if( !this._observableProps.observers[e] ) {
               log.warn('Observable.observe: invalid event type %s', e);
            }
            else {
               this._observableProps.observers[e].push(obs);
               this._observableProps.onAdd && this._observableProps.onAdd(e, obs);
            }
         }, this);
         return obs;
      },

      hasAnyObservers: function(exclude) {
         if( !exclude ) { exclude = []; }
         return util.contains(this._observableProps.observers, function(list, event) {
            return !util.contains(exclude, event) && this.hasObservers(event);
         }, this);
      },

      hasObservers: function(event) {
         var obs = this.getObservers(event);
         if( !obs ) { log.info('Observable.hasObservers: invalid event type %s', event); }
         return obs && obs.length > 0;
      },

      /**
       * @param {String|Array} event
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       */
      stopObserving: function(event, callback, scope) {
         if( !event ) { event = util.keys(this._observableProps.observers); }
         if( util.isArray(event) ) {
            util.each(event, function(e) {
               this.stopObserving(e, callback, scope);
            }, this);
         }
         else {
            var removes = [];
            util.each(this._observableProps.observers[event], function(obs) {
               if( obs.matches(event, callback, scope) ) {
                  obs.notifyCancelled(null, event, this);
                  removes.push(obs);
                  this._observableProps.onRemove && this._observableProps.onRemove(event, obs);
               }
            }, this);
            removeAll(this._observableProps.observers[event], removes);
         }
      },

      getObservedEvents: function() {
         return util.keys(this._observableProps.observers);
      },

      getObservers: function(event) {
         if( !event ) {
            var out = [];
            util.each(this._observableProps.observers, function(list) {
               util.each(list, function(obs) {
                  out.push(obs);
               });
            });
            return out;
         }
         return this._observableProps.observers[event];
      },

      triggerEvent: function(event) {
         var args = util.toArray(arguments, 1), observers = this._observableProps.observers;
         var onEvent = this._observableProps.onEvent;
         log('triggerEvent %s', this, event, onEvent); //debug
         util.each(util.isArray(event)? event : [event], function(e) {
            onEvent && onEvent(event, args);
            util.each(observers[e], function(obs) {
               obs.notify.apply(obs, args);
            });
         });
      }
   };

   function toArray(val) {
      return util.isArray(val)? val : [val];
   }

   function removeAll(list, items) {
      util.each(items, function(x) {
         var i = util.indexOf(list, x);
         if( i >= 0 ) {
            list.splice(i, 1);
         }
      });
   }

   util.Observable = Observable;
})(exports, fb);