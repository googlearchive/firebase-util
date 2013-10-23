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
         throw new Error('um?');
      }
      this.fn = notifyFn;
      this.events = util.isArray(events)? events : [events];
      this.cancelFn = cancelFn||function() {};
      this.context = context||null;
   }

   Observer.prototype = {
      notify: function() {
         this.fn.apply(this.context, util.toArray(arguments));
      },

      matches: function(event, fn, context) {
         if( util.isArray(event) ) {
            return util.find(event, function(e) {
               return this.matches(e, fn, context);
            }, this) !== undefined;
         }
         return (!event || util.contains(this.events, event))
            && (!fn || fn === this.fn)
            && (!context || context === this.context);
      },

      notifyCancelled: function(err, event, observable) {
         this.cancelFn(err||null, event, observable);
      }
   };

   util.Observer = Observer;

})(exports, fb);