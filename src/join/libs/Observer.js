(function (exports, fb) {
   "use strict";

   /** OBSERVER
    ***************************************************
    * @private
    * @constructor
    */
   function Observer(event, notifyFn, cancelFn, context) {
      this.event = event;
      this.fn = notifyFn;
      this.cancelFn = cancelFn;
      this.context = context;
   }

   Observer.prototype = {
      notify: function(snapshot, prevChild) {
         this.fn(snapshot, prevChild);
      },

      matches: function(event, fn, context) {
         if( fb.util.isArray(event) ) {
            return fb.util.find(event, fb.bind(this.matches, this)) !== null;
         }
         else {
            return (!event || event === this.event)
               && (!fn || fn === this.fn)
               && (!context || context === this.context);
         }
      },

      dispose: function(err) {
         err && this.cancelFn && this.cancelFn(err);
      }
   };

   fb.package('join').Observer = Observer;

})(exports, fb);