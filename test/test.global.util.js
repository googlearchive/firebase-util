var expect = require('chai').expect;

describe('global.js', function() {
   var undefined;
   var util = require('../firebase-utils.js')._ForTestingOnly.util;
   var fbExports = require('../firebase-utils.js');

   describe('#isObject', function() {
      it('should be true for {}', function() {
         expect(util.isObject({})).to.be.true;
      });

      it('should be true for {hello: "world"}', function() {
         expect( util.isObject({ hello: "world" }), true).to.be.true;
      });

      it('should be true for new Date', function() {
         expect( util.isObject(new Date()), true).to.be.true;
      });

      it('should return true for []', function() {
         expect( util.isObject([]), true).to.be.true;
      });

      it('should be false for null', function() {
         expect( util.isObject(null), false).to.be.false;
      });

      it('should be false for "hello"', function() {
         expect( util.isObject("hello"), false).to.be.false;
      });

      it('should be false for 1', function() {
         expect( util.isObject(1), false).to.be.false;
      });

      it('should be false for undefined', function() {
         expect( util.isObject(undefined)).to.be.false;
      });
   });

   describe('#isArray', function() {
      it('should be false for {}', function() {
         expect( util.isArray({}), false).to.be.false;
      });

      it('should be false for new Date', function() {
         expect( util.isArray(new Date()), false).to.be.false;
      });

      it('should return true for []', function() {
         expect( util.isArray([]), true).to.be.true;
      });

      it('should return true for ["apple"]', function() {
         expect( util.isArray(["apple"]), true).to.be.true;
      });

      it('should be false for null', function() {
         expect( util.isArray(null), false).to.be.false;
      });

      it('should be false for "hello"', function() {
         expect( util.isArray("hello"), false).to.be.false;
      });

      it('should be false for 1', function() {
         expect( util.isArray(1), false).to.be.false;
      });

      it('should be false for undefined', function() {
         expect( util.isArray(undefined)).to.be.false;
      });
   });

   describe('#extend', function() {
      it('should work for merging objects', function() {
         expect(util.extend({happy: 'happy'}, {'joy': 'joy'})).to.eql({happy: 'happy', joy: 'joy'});
      });

      it('should return the first argument', function() {
         var firstArg = {};
         expect(util.extend(firstArg, {'joy': 'joy'})).to.equal(firstArg);
      });

      it('should not fail if a non-object is passed in', function() {
         expect(util.extend({happy: 'happy'}, null, 5, true, {'joy': 'joy'})).to.eql({happy: 'happy', joy: 'joy'});
      });

      it('should ignore strings and not iterate their characters', function() {
         expect(util.extend({foo: 'bar'}, 'hello world', {hello: 'world'})).to.eql({foo: 'bar', hello: 'world'});
      });

      it('should work for many objects', function() {
         expect(util.extend({}, {one: 1}, {two: 2}, {three: {thirty: 30}}, {four: 4})).to.eql({one: 1, two: 2, three: {thirty: 30}, four: 4});
      });

      it('should recursively merge if true is passed as first arg', function() {
         expect(util.extend(true, {a: {one: 1, two: 2}, b: 2}, {a: {two: 22, three: 33}, b: 22})).to.eql({a: {one: 1, two: 22, three: 33}, b: 22});
      });
   });

   describe('#bind', function() {
      it('should set `this` appropriately', function() {
         var obj = {hello: 'world'};
         function tryBind() {
            return this.hello;
         }
         expect(util.bind(tryBind, obj)()).to.eql('world');
      });

      it('should work with arguments', function() {
         var obj = {hello: 'world'};
         function tryBind(a) {
            return a+' '+this.hello;
         }
         expect(util.bind(tryBind, obj, 'hello')()).to.eql('hello world');
      });

      it('should work with null scope', function() {
         function tryBind(a, b) {
            return a+' '+b;
         }
         expect(util.bind(tryBind, null, 'hello', 'world')()).to.eql('hello world');
      });
   });

   describe('#each', function() {
      it('should iterate an array', function() {
         var vals = ['a', 'b', 'c'];
         var ct = 0;
         util.each(vals, function(v, k) {
            expect(k).to.equal(ct);
            expect(v).to.equal(vals[k]);
            ct++;
         });
         expect(ct).to.equal(vals.length);
      });

      it('should iterate an empty array', function() {
         var ct = 0;
         util.each([], function() { ct++; });
         expect(ct).to.equal(0);
      });

      it('should iterate an object', function() {
         var vals = {one: 0, two: 1, three: 2};
         var ct = 0;
         util.each(vals, function(v, k) {
            expect(v).to.equal(ct);
            expect(vals[k]).to.equal(ct);
            ct++;
         });
         expect(ct).to.equal(3);
      });

      it('should iterate an empty object', function() {
         var ct = 0;
         util.each({}, function() { ct++; });
         expect(ct).to.equal(0);
      });

      it('should iterate arguments object', function(){
         var ct = 0;
         var args = ['a', 'b', 'c'];
         function itList() {
            util.each(arguments, function(v,i) {
               expect(i).to.equal(ct);
               expect(v).to.equal(args[i]);
               ct++;
            });
            expect(ct).to.equal(args.length);
         }
         itList.apply(null, args);
      });
   });

   describe('#keys', function() {
      it('should iterate array', function() {
         expect(util.keys(['a', 'b', 'c'])).to.eql([0, 1, 2]);
      });

      it('should iterate object', function() {
         expect(util.keys({foo: 'hello', bar: 'world'})).to.eql(['foo', 'bar']);
      });

      it('should not fail with null', function() {
         expect(util.keys(null)).to.eql([]);
      });
   });

   describe('#map', function() {
       it('should iterate array', function() {
          var res = util.map([1, 2, 3], function(v, k) { return v*2; });
          expect(res).to.eql([2, 4, 6]);
       });

      it('should iterate objects', function() {
         var res = util.map({foo: 'bar'}, function(v, k) { return k; });
         expect(res).to.eql(['foo']);
      });

      it('should not fail with null', function() {
         var res = util.map(null, function(v, k) { return 'oops'; });
         expect(res).to.eql([]);
      });

      it('should skip undefined values', function() {
         var res = util.map([1, 2, undefined, 3], function(v) { return v; });
         expect(res).to.eql([1, 2, 3]);
      });
   });

   describe('#mapObject', function() {
      it('should map objects', function() {
         var res = util.mapObject({foo: 'bar'}, function(v, k) { return k+':'+v; });
         expect(res).to.eql({foo: 'foo:bar'});
      });

      it('should not mind empty objects', function() {
         var res = util.mapObject({}, function() { return null; });
         expect(res).to.eql({});
      });

      it('should skip undefined values', function() {
         var res = util.mapObject({a: false, b: null, c: true, d: ''}, function(v,k) { return k === 'c'? undefined : v; });
         expect(res).to.have.keys(['a', 'b', 'd']);
      });

      it('should not fail with null', function() {
         var res = util.mapObject(null, function(v, k) { return 'oops'; });
         expect(res).to.eql({});
      });
   });

   describe('#indexOf', function() {
      it('should return -1 if not found', function() {
         expect(util.indexOf(['a', 'b', 'c'], 2)).to.equal(-1);
      });

      it('should return correct index if found', function() {
         expect(util.indexOf(['a', 'b', 'c'], 'c')).to.equal(2);
      });
   });

   describe('#remove', function() {
      it('should remove existing item from array', function() {
         var list = ['a', 'b', 'c', 'd', 'e'];
         expect(util.remove(list, 'c')).to.be.true;
         expect(list).to.eql(['a', 'b', 'd', 'e']);
      });

      it('should remove item from 0 index', function() {
         var list = ['a', 'b', 'c', 'd', 'e'];
         expect(util.remove(list, 'a')).to.be.true;
         expect(list).to.eql(['b', 'c', 'd', 'e']);
      });

      it('should remove item from last index', function() {
         var list = ['a', 'b', 'c', 'd', 'e'];
         expect(util.remove(list, 'e')).to.be.true;
         expect(list).to.eql(['a', 'b', 'c', 'd']);
      });

      it('should not remove non-existent item from array', function() {
         var list = ['a', 'b', 'c', 'd', 'e'];
         expect(util.remove(list, 'f')).to.be.false;
         expect(list).to.eql(['a', 'b', 'c', 'd', 'e']);
      });

      it('should remove existing item from an object', function() {
         var list = {a: 1, b: 2, c: 3, d: 4, e: 5};
         expect(util.remove(list, 3)).to.be.true;
         expect(list).to.eql({a: 1, b: 2, d: 4, e: 5});
      });

      it('should not remove non-existent item from an object', function() {
         var list = {a: 1, b: 2, c: 3, d: 4, e: 5};
         expect(util.remove(list, 0)).to.be.false;
         expect(list).to.eql({a: 1, b: 2, c: 3, d: 4, e: 5});
      });

      it('should not fail if passed null', function() {
         expect(util.remove(null, 5)).to.be.false;
      })
   });

   describe('#isEmpty', function() {
      it('returns true for empty array', function() {
         expect(util.isEmpty([])).to.be.true;
      });

      it('returns false for full array', function() {
         expect(util.isEmpty([null])).to.be.false;
      });

      it('returns true for empty object', function() {
         expect(util.isEmpty({})).to.be.true;
      });

      it('returns false for full object', function() {
         expect(util.isEmpty({foo: 'bar'})).to.be.false;
      });

      it('returns false for a primitive value', function() {
         expect(util.isEmpty(0)).to.be.false;
      });

      it('returns true for null', function() {
         expect(util.isEmpty(null)).to.be.true;
      });

      it('returns true for undefined', function() {
         expect(util.isEmpty()).to.be.true;
      });
   });

   describe('#find', function() {
      it('passes a value and index for arrays', function() {
         util.find(['foo'], function(v, k) {
            expect(v).to.equal('foo');
            expect(k).to.equal(0);
         });
      });

      it('passes a value and a key for objects', function() {
         util.find({foo: 'bar'}, function(v, k) {
            expect(v).to.equal('bar');
            expect(k).to.equal('foo');
         });
      });

      it('finds an item in an array', function() {
         var res = util.find(['foo', 'bar'], function(v) { return v === 'bar'; });
         expect(res).to.equal('bar');
      });

      it('finds an item in an object', function() {
         var res = util.find({'foo': 'bar', 'hello': 'world'}, function(v, k) {
            return k === 'hello';
         });
         expect(res).to.equal('world');
      });

      it('returns undefined if no item found in array', function() {
         var res = util.find(['foo', 'bar'], function() { return false; });
         expect(res).to.equal(undefined);
      });

      it('returns undefined if no item found in object', function() {
         var res = util.find({'foo': 'bar'}, function() { return false; });
         expect(res).to.equal(undefined);
      });
   });

   describe('#defer', function() {
      it('should get invoked', function(done) {
         util.defer(done);
      });

      it('should not be invoked synchronously', function() {
         var called = false;
         util.defer(function() {
            called = true;
         });
         expect(called).to.be.false;
      });
   });

   describe('#isEqual', function() {
      it('should return false for null vs object', function() {
         expect(util.isEqual(null, {})).to.be.false;
      });

      it('should return false for null vs 0', function() {
         expect(util.isEqual(null, 0)).to.be.false;
      });

      it('should return false for null vs undefined', function() {
         expect(util.isEqual(null, undefined)).to.be.false;
      });

      it('should return true for null,null', function() {
         expect(util.isEqual(null, null)).to.be.true;
      });

      it('should return true for two empty objects', function() {
         expect(util.isEqual({}, {})).to.be.true;
      });

      it('should return false for two obects with diff values of same type', function() {
         expect(util.isEqual({foo: 'foo', bar: 'bar'}, {foo: 'ffoo', bar: 'bar'})).to.be.false;
      });

      it('should return false for two obects with same value of diff types (string vs number)', function() {
         expect(util.isEqual({foo: 1, bar: 2}, {foo: 1, bar: "2"})).to.be.false;
      });

      it('should return true if keys are in diff order for an object', function() {
         expect(util.isEqual({foo: "ffoo", bar: "barr"}, {bar: "barr", foo: "ffoo"})).to.be.true;
      });

      it('should return true for nested equal objects', function() {
         expect(util.isEqual({foo: "ffoo", bar: {barr: "barr"}}, {bar: {barr: "barr"}, foo: "ffoo"})).to.be.true;
      });

      it('should return true for [] vs []', function() {
         expect(util.isEqual([], [])).to.be.true;
      });

      it('should return true for nested equal arrays', function() {
         expect(util.isEqual([1, 2, [3, 4]], [1, 2, [3, 4]])).to.be.true;
      });

      it('should return false for diff values of same type in an array', function() {
         expect(util.isEqual([1], [2])).to.be.false;
      });

      it('should return false for nested arrays with values of diff types (string vs number)', function() {
         expect(util.isEqual([1, 2, [3, 4]], [1, 2, [3, "4"]])).to.be.false;
      });

      it('should return true for two equal integers', function() {
         expect(util.isEqual(1,1)).to.be.true;
      });

      it('should return false for two diff integers', function() {
         expect(util.isEqual(1,2)).to.be.false;
      });

      it('should return false for primitives of diff type (string vs number)', function() {
         expect(util.isEqual(1,"1")).to.be.false;
      });

      it('should return false for object vs array, even if same keys/vals', function() {
         expect(util.isEqual({0: 1}, [1])).to.be.false;
      });

   });

   describe('#has', function() {
      it('should find index in an array', function() {
         expect(util.has(['a', 'b', 'c', 'd'], 3)).to.be.true;
      });

      it('should find index in a hash', function() {
         expect(util.has({foo: 1, bar: 2}, 'bar')).to.be.true;
      });

      it('should return false if index not in array', function() {
         expect(util.has([1,2,3], 5)).to.be.false;
      });

      it('should return false if index not in object', function() {
         expect(util.has({foo: 1, bar: 2}, 'foobar')).to.be.false;
      });

      it('should return false if source is not a list', function() {
         expect(util.has(null, 5)).to.be.false;
      });
   });

   describe('#contains', function() {
      it('should find a value in an array', function() {
         expect(util.contains(['a', 'b', 'c', 'd'], 'c')).to.be.true;
      });

      it('should find using function in array', function() {
         expect(util.contains(['a', 'b', 'c', 'd'], function(v) { return v === 'c'; })).to.be.true;
      });

      it('should find a value in a hash', function() {
         expect(util.contains({foo: 'bar', hello: 'world'}, 'bar')).to.be.true;
      });

      it('should find using function in a hash', function() {
         expect(util.contains({foo: 'bar', hello: 'world'}, function(v,k) { return k === 'hello'; })).to.be.true;
      });

      it('should return false if value not found in array', function() {
         expect(util.contains([1,2,3], 5)).to.be.false;
      });

      it('should return false if value not found in object', function() {
         expect(util.contains({foo: 1, bar: 2}, 0)).to.be.false;
      });

      it('should return false if source is not a list', function() {
         expect(util.contains(null, 5)).to.be.false;
      });
   });

   describe('#inherit', function() {
      it('should be instanceof inherited class', function() {
         function A() {}
         function B() {}
         util.inherit(B, A);
         expect(new B).instanceOf(A);
      });

      it('should preserve prototype methods added before calling inherit', function() {
         function A() {}
         function B() {}
         B.prototype.hello = function() { return 'world'; };
         util.inherit(B, A);
         var b = new B;
         expect(b.hello).to.be.a('function');
         expect(b.hello()).to.equal('world');
      });

      it('should override methods that exist in both source and dest', function() {
         function A() {}
         A.prototype.foo = function() { return 'A'; };
         function B() {}
         B.prototype.foo = function() { return 'B'; };
         util.inherit(B, A);
         var b = new B;
         expect(b.foo).to.be.a('function');
         expect(b.foo()).to.equal('B');
      });

      it('should copy prototype vars', function() {
         function A() {}
         A.prototype.foo = 'A';
         function B() {}
         B.prototype.bar = 'B';
         util.inherit(B, A);
         var b = new B;
         expect(b.foo).to.equal('A');
         expect(b.bar).to.equal('B');
      });

      it('should add additional methods passed into inherit', function() {
         function A() {}
         A.prototype.foo = 'A';
         function B() {}
         B.prototype.foo = 'B';
         util.inherit(B, A, {foo: 'C'});
         var b = new B;
         expect(b.foo).to.equal('C');
      });

      it('should inherit super of inherited class', function() {
         function A() {}
         A.prototype.foo = 'A';
         function B() {}
         B.prototype.foo = 'B';
         function C() {}
         C.prototype.foo = 'C';
         util.inherit(B, A);
         util.inherit(C, B);
         var c = new C;
         expect(c).instanceOf(B);
         expect(c).instanceOf(A);
         expect(c.foo).to.equal('C');
      });
   });

   describe('#bindAll', function() {
      it('should return the object being bound', function() {
         var o = { foo: function() {}, bar: function() {} };
         expect(util.bindAll({}, o)).to.equal(o);
      });

      it('should set `this` for all methods', function() {
         var a = {};
         var o = {
            foo: function() { expect(this).to.equal(a); },
            bar: function() { expect(this).to.equal(a); }
         };
         util.bindAll(a, o);
         o.foo.call();
         o.bar.call();
      });

      it('should not affect anything but functions', function() {
         var list = ['a', 'b'];
         var o = {
            foo: function() { expect(this).to.equal(a); },
            bar: function() { expect(this).not.to.equal(a); },
            omega: list
         };
         util.bindAll({}, o);
         expect(o.omega).to.equal(list);
      });
   });

   describe('#filter', function() {
      it('should remove items from array', function() {
         var vals = util.filter(['a', 'b', 'c', 'd', 'e'], function(v, k) {
            return v !== 'c' && k !== 0;
         });
         expect(vals).to.eql(['b', 'd', 'e']);
      });

      it('should remove items from object', function() {
         var vals = util.filter({one: 1, two: 2, three: 3, four: 4, five: 5}, function(v,k) {
            return v !== 1 && k !== 'five';
         });
         expect(vals).to.eql({two: 2, three: 3, four: 4});
      });

      it('should set `this` to scope in fn', function() {
         var a = {};
         util.each(['a', 'b', 'c'], function() {
            expect(this).to.equal(a);
         }, a);
      })
   });

   describe('NotSupportedError', function() {
      it('should be instanceof Error', function() {
         expect(new fbExports.NotSupportedError('hello world')).instanceOf(Error);
      });

      it('should have a stack trace', function() {
         expect(new fbExports.NotSupportedError('hello world').stack).not.to.be.empty;
      });

      it('should preserve the message I give it', function() {
         expect(new fbExports.NotSupportedError('hello world').toString()).to.contain('hello world');
      });
   })

});
