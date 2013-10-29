(function (exports, fb) {
   var undefined;
   var util = fb.pkg('util');

   /** Observer
    ***************************************************
    * @private
    * @constructor
    */
   function Observer(events, notifyFn, context, cancelFn) {
      if( typeof(notifyFn) !== 'function' ) {
         throw new Error('Must provide a valid notifyFn');
      }
      this.fn = notifyFn;
      this.events = util.isArray(events)? events : [events];
      this.cancelFn = cancelFn||function() {};
      this.context = context;
   }

   Observer.prototype = {
      notify: function() {
         var args = util.toArray(arguments);
         // defer here so no locally cached data causes out-of-order operations
         // better safe than sorry
//         util.defer(function() {
            this.fn.apply(this.context||null, args);
//         }, this);
      },

      matches: function(event, fn, context) {
         if( util.isArray(event) ) {
            return util.find(event, function(e) {
               return this.matches(e, fn, context);
            }, this) !== undefined;
         }
         return (!event || util.contains(this.events, event))
            && (!fn || fn === this || fn === this.fn)
            && (!context || context === this.context);
      },

      notifyCancelled: function(err, event, observable) {
         this.cancelFn.call(this.context||null, err||null, event, observable);
      }
   };

   util.Observer = Observer;

})(exports, fb);