(function (fb) {
   "use strict";

   /** EMPTY SNAP
    ***************************************************
    * @private
    * @constructor
    */
   function EmptySnap(rec, key) { this.key = key; this.rec = rec; }
   EmptySnap.prototype = {
      name: function() { return this.key; },
      val: function() { return {}; },
      forEach: noop,
      ref: function() { return this.rec; },
      hasChild: no,
      hasChildren: no,
      getPriority: noop,
      exportVal: noop,
      child: function(childPath) {
         var ref = this.rec.child(childPath);
         return new EmptySnap(ref.name(), ref);
      }
   };

   function no() { return false; }
   function noop() { return null; }

   fb.package('join').EmptySnap = EmptySnap;

})(fb);