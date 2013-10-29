(function(exports, fb) {
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function JoinedSnapshot(rec, data) {
      this.rec = rec;
      this.data = util.isEmpty(data)? null : data;
   }

   JoinedSnapshot.prototype = {
      val:         function() { return this.data; },
      child:       function() { return this.rec.child.apply(this.rec, util.toArray(arguments)); },
      forEach:     function(cb) {
         // use find because if cb returns true, then forEach should exit
         return !!util.find(this.data, function(v, k) {
            !util.isEmpty(v) && cb(new JoinedSnapshot(this.child(k), v));
         }, this);
      },

      hasChild:    function() {}, //todo
      hasChildren: function() { return util.isObject(this.data) && !util.isEmpty(this.data) },

      name:        function() { return this.rec.name(); },
      numChildren: function() { return util.keys(this.data, function() {return null}).length; },
      ref:         function() { return this.rec; },

      getPriority: function() {}, //todo
      exportVal:   function() {}, //todo

      isEqual: function(val) {
         return util.isEqual(this.data, val);
      }
   };

   fb.join.JoinedSnapshot = JoinedSnapshot;
})(exports, fb);
