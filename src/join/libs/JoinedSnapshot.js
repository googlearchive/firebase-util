(function(exports, fb) {
   var log  = fb.pkg('log');
   var util = fb.pkg('util');
   var join = fb.pkg('join');

   function JoinedSnapshot(rec, data, priority) {
      this.rec = rec;
      this.priority = priority;
      this.data = this._loadData(data);
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

      hasChild:    function(key) {
         var dat = this.data;
         return !util.contains(key.split('/'), function(keyPart) {
            if( util.has(dat, keyPart) ) {
               dat = dat[keyPart];
               return false;
            }
            else {
               return true;
            }
         });
      },

      hasChildren: function() { return util.isObject(this.data) && !util.isEmpty(this.data) },

      name:        function() { return this.rec.name(); },
      numChildren: function() { return util.keys(this.data, function() {return null}).length; },
      ref:         function() { return this.rec; },
      getPriority: function() { return this.priority; },
      exportVal:   function() { throw new Error('Nobody implemented me :('); },

      isEqual: function(val) {
         return util.isEqual(this.data, this._loadData(val));
      },

      _loadData: function(data) {
         return util.isEmpty(data)? null : (util.isObject(data) && util.isEqual(util.keys(data), ['.value'])? data['.value'] : data);
      }
   };

   fb.join.JoinedSnapshot = JoinedSnapshot;
})(exports, fb);
