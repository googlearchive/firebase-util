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
            if( !util.has(this._observableProps.observers, e) ) {
               log.warn('Observable.observe: invalid event type %s', e);
            }
            else {
               this.getObservers(e).push(obs);
               this._observableProps.onAdd && this._observableProps.onAdd(e, obs);
            }
         }, this);
         return obs;
      },

      /**
       * @param {String|Array} [event]
       * @returns {boolean}
       */
      hasObservers: function(event) {
         return this.getObservers(event).length > 0;
      },

      /**
       * @param {String|Array} event
       * @param {Function|util.Observer} callback
       * @param {Object} [scope]
       */
      stopObserving: function(event, callback, scope) {
         if( arguments.length === 1 && (typeof(event) === 'function' || event instanceof util.Observer)) {
            callback = event;
            event = null;
         }
         if( !event ) { event = util.keys(this._observableProps.observers); }
         if( util.isArray(event) ) {
            util.each(event, function(e) {
               this.stopObserving(e, callback, scope);
            }, this);
         }
         else {
            var removes = [];
            var observers = this.getObservers(event);
            var onRemove = this._observableProps.onRemove;
            util.each(observers, function(obs) {
               if( obs.matches(event, callback, scope) ) {
                  obs.notifyCancelled(null, event, this);
                  removes.push(obs);
               }
            }, this);
            removeAll(observers, removes);
            onRemove && onRemove(event, removes);
         }
      },

      /**
       * Turn off all observers and call cancel callbacks with an error
       * @param {String} error
       * @returns {*}
       */
      abortObservers: function(error) {
         console.log('abortObservers', error); //debug
         var removes = [];
         var onRemove = this._observableProps.onRemove;
         util.each(util.keys(this._observableProps.observers), function() {
            var observers = this.getObservers();
            util.each(observers, function(obs) {
               obs.notifyCancelled(error, event, this);
               removes.push(obs);
            }, this);
            removeAll(observers, removes);
            onRemove && onRemove(event, removes);
         }, this);
      },

      /**
       * @param {String|Array} [event]
       * @returns {*}
       */
      getObservers: function(event) {
         if( !event || util.isArray(event) ) {
            var out = [];
            util.each(this._observableProps.observers, function(list, key) {
               if( !event || util.contains(event, key) ) {
                  out = out.concat(list);
               }
            }, this);
            return out;
         }
         if( !util.has(this._observableProps.observers, event) ) {
            log.warn('Observable.hasObservers: invalid event type %s', event);
            return [];
         }
         return this._observableProps.observers[event];
      },

      triggerEvent: function(event) {
         var args = util.toArray(arguments, 1);
         var onEvent = this._observableProps.onEvent;
         util.each(util.isArray(event)? event : [event], function(e) {
            var observers = this.getObservers(e), ct = 0;
//            log('triggering %s for %d observers with args', event, observers.length, args, onEvent);
            util.each(observers, function(obs) {
               obs.notify.apply(obs, args);
               ct++;
            });
            onEvent && onEvent.apply(null, [e, ct].concat(args));
         }, this);
      }
   };

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