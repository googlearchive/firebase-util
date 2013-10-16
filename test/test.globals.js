var assert = require('chai').assert;

describe('global.js', function() {
   var undefined;
   var fb = require('../firebase-utils.js')._ForTestingOnly;

   describe('#isObject', function() {
      it('should be true for {}', function() {
         assert.strictEqual( fb.util.isObject({}), true);
      });

      it('should be true for {hello: "world"}', function() {
         assert.strictEqual( fb.util.isObject({ hello: "world" }), true);
      });

      it('should be true for new Date', function() {
         assert.strictEqual( fb.util.isObject(new Date()), true);
      });
      
      it('should return true for []', function() {
         assert.strictEqual( fb.util.isObject([]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( fb.util.isObject(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( fb.util.isObject("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( fb.util.isObject(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( fb.util.isObject(undefined), false );
      });
   });

   describe('#isArray', function() {
      it('should be false for {}', function() {
         assert.strictEqual( fb.util.isArray({}), false);
      });

      it('should be false for new Date', function() {
         assert.strictEqual( fb.util.isArray(new Date()), false);
      });

      it('should return true for []', function() {
         assert.strictEqual( fb.util.isArray([]), true);
      });

      it('should return true for ["apple"]', function() {
         assert.strictEqual( fb.util.isArray(["apple"]), true);
      });

      it('should be false for null', function() {
         assert.strictEqual( fb.util.isArray(null), false);
      });

      it('should be false for "hello"', function() {
         assert.strictEqual( fb.util.isArray("hello"), false);
      });

      it('should be false for 1', function() {
         assert.strictEqual( fb.util.isArray(1), false);
      });

      it('should be false for undefined', function() {
         assert.strictEqual( fb.util.isArray(undefined), false );
      });
   });

   describe('#extend', function() {
      it('should work for merging objects', function() {
         assert.deepEqual(fb.util.extend({happy: 'happy'}, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should return the first argument', function() {
         var firstArg = {};
         assert.strictEqual(fb.util.extend(firstArg, {'joy': 'joy'}), firstArg);
      });

      it('should not fail if a non-object is passed in', function() {
         assert.deepEqual(fb.util.extend({happy: 'happy'}, null, 5, true, {'joy': 'joy'}), {happy: 'happy', joy: 'joy'});
      });

      it('should work for many objects', function() {
         assert.deepEqual(fb.util.extend({}, {one: 1}, {two: 2}, {three: {thirty: 30}}, {four: 4}), {one: 1, two: 2, three: {thirty: 30}, four: 4});
      });
   });

   describe('#bind', function() {
      it('should set `this` appropriately', function() {
         var obj = {hello: 'world'};
         function tryBind() {
            return this.hello;
         }
         assert.strictEqual(fb.util.bind(tryBind, obj)(), 'world');
      });

      it('should work with arguments', function() {
         var obj = {hello: 'world'};
         function tryBind(a) {
            return a+' '+this.hello;
         }
         assert.strictEqual(fb.util.bind(tryBind, obj, 'hello')(), 'hello world');
      });

      it('should work with null scope', function() {
         function tryBind(a, b) {
            return a+' '+b;
         }
         assert.strictEqual(fb.util.bind(tryBind, null, 'hello', 'world')(), 'hello world');
      });
   });

   describe('#each', function() {
      it('should iterate an array', function() {
         var vals = ['a', 'b', 'c'];
         var ct = 0;
         fb.util.each(vals, function(v, k) {
            assert.strictEqual(k, ct, 'correct index returned on each iteration');
            assert.strictEqual(v, vals[k], 'correct value at each iteration');
            ct++;
         });
         assert.strictEqual(ct, vals.length, 'all values were iterated');
      });

      it('should iterate an empty array', function() {
         var ct = 0;
         fb.util.each([], function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate an object', function() {
         var vals = {one: 0, two: 1, three: 2};
         var ct = 0;
         fb.util.each(vals, function(v, k) {
            assert.strictEqual(v, ct, 'has correct value at each iteration');
            assert.strictEqual(vals[k], ct, 'has correct key at each iteration');
            ct++;
         });
         assert.strictEqual(ct, 3, 'all values iterated');
      });

      it('should iterate an empty object', function() {
         var ct = 0;
         fb.util.each({}, function() { ct++; });
         assert.strictEqual(ct, 0, 'no values iterated');
      });

      it('should iterate arguments object', function(){
         var ct = 0;
         var args = ['a', 'b', 'c'];
         function itList() {
            fb.util.each(arguments, function(v,i) {
               assert.strictEqual(i, ct, 'correct index returned on each iteration');
               assert.strictEqual(v, args[i], 'correct value at each iteration');
               ct++;
            });
            assert.strictEqual(ct, args.length, 'all arguments iterated');
         }
         itList.apply(null, args);
      });
   });

   describe('#keys', function() {
      it('should iterate array', function() {
         assert.deepEqual(fb.util.keys(['a', 'b', 'c']), [0, 1, 2]);
      });

      it('should iterate object', function() {
         assert.deepEqual(fb.util.keys({foo: 'hello', bar: 'world'}), ['foo', 'bar']);
      });

      it('should not fail with null', function() {
         assert.deepEqual(fb.util.keys(null), []);
      });
   });

   describe('#map', function() {
       it('should iterate array', function() {
          var res = fb.util.map([1, 2, 3], function(v, k) { return v*2; });
          assert.deepEqual(res, [2, 4, 6]);
       });

      it('should iterate objects', function() {
         var res = fb.util.map({foo: 'bar'}, function(v, k) { return k; });
         assert.deepEqual(res, ['foo']);
      });

      it('should not fail with null', function() {
         var res = fb.util.map(null, function(v, k) { return 'oops'; });
         assert.deepEqual(res, []);
      });
   });

   describe('#indexOf', function() {
      it('should return -1 if not found', function() {
         assert.strictEqual(fb.util.indexOf(['a', 'b', 'c'], 2), -1);
      });

      it('should return correct index if found', function() {
         assert.strictEqual(fb.util.indexOf(['a', 'b', 'c'], 'c'), 2);
      });
   });

   describe('#isEmpty', function() {
      it('returns true for empty array', function() {
         assert.isTrue(fb.util.isEmpty([]));
      });

      it('returns false for full array', function() {
         assert.isFalse(fb.util.isEmpty([null]));
      });

      it('returns true for empty object', function() {
         assert.isTrue(fb.util.isEmpty({}));
      });

      it('returns false for full object', function() {
         assert.isFalse(fb.util.isEmpty({foo: 'bar'}));
      });

      it('does not fail for a primitive or null', function() {
         assert.isFalse(fb.util.isEmpty(null));
      });
   });

   describe('#find', function() {
      it('passes a value and index for arrays', function() {
         fb.util.find(['foo'], function(v, k) {
            assert.strictEqual(v, 'foo', 'expected "foo"');
            assert.strictEqual(k, 0, 'expected zero');
         });
      });

      it('passes a value and a key for objects', function() {
         fb.util.find({foo: 'bar'}, function(v, k) {
            assert.strictEqual(v, 'bar', 'expected "bar"');
            assert.strictEqual(k, 'foo', 'expected "foo""');
         });
      });

      it('finds an item in an array', function() {
         var res = fb.util.find(['foo', 'bar'], function(v) { return v === 'bar'; });
         assert.strictEqual(res, 'bar');
      });

      it('finds an item in an object', function() {
         var res = fb.util.find({'foo': 'bar', 'hello': 'world'}, function(v, k) {
            return k === 'hello';
         });
         assert.strictEqual(res, 'world');
      });

      it('returns undefined if no item found in array', function() {
         var res = fb.util.find(['foo', 'bar'], function() { return false; });
         assert.strictEqual(res, undefined);
      });

      it('returns undefined if no item found in object', function() {
         var res = fb.util.find({'foo': 'bar'}, function() { return false; });
         assert.strictEqual(res, undefined);
      });
   });

});
