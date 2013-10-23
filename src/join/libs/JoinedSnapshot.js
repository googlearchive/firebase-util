(function(exports, fb) {
   fb.pkg('join');

   function JoinedSnapshot(rec, data) {
      this.rec = rec;
      this.data = data;
   }

   JoinedSnapshot.prototype = {
      val:         function() { return this.data; },
      child:       function() { return this.rec.child.apply(this.rec, fb.util.toArray(arguments)); },
      forEach:     function(cb) {
         // use find because if cb returns true, then forEach should exit
         return !!fb.util.find(this.data, function(v, k) {
            if( v !== null && v !== undefined ) {
               return cb(new JoinedSnapshot(this.child(k), v));
            }
         }, this);
      },

      hasChild:    function() {}, //todo
      hasChildren: function() {}, //todo

      name:        function() { return this.rec.name(); },
      numChildren: function() { return fb.util.map(this.data, function() {return null}).length; },
      ref:         function() { return this.rec; },

      getPriority: function() {}, //todo
      exportVal:   function() {} //todo
   };

   fb.join.JoinedSnapshot = JoinedSnapshot;
})(exports, fb);
