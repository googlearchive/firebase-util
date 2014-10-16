'use strict';
var fbutil = require('../../src/common');
var Observable = fbutil.Observable;

describe('common/Observable.js', function() {

   describe('#triggerEvent', function() {
      it('should notify all observers', function() {
         var fn1 = jasmine.createSpy(), fn2 = jasmine.createSpy();
         var obs = new Observable(['test']);
         obs.observe('test', fn1);
         obs.observe('test', fn2);
         obs.triggerEvent('test', 'hi');
         expect(fn1).toHaveBeenCalledWith('hi');
         expect(fn2).toHaveBeenCalledWith('hi');
      });

      it('should accept an array of events', function() {
         var fn1 = jasmine.createSpy(), fn2 = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.triggerEvent(['test1', 'test2'], 'hello');
         expect(fn1).toHaveBeenCalledWith('hello');
         expect(fn2).toHaveBeenCalledWith('hello');
      });

      it('should pass additional arguments to the callbacks', function() {
         var res1 = 0, res2 = 0;
         function fn1() { res1 = fbutil.toArray(arguments); }
         function fn2() { res2 = fbutil.toArray(arguments); }

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.triggerEvent('test1', 'a', 'b');
         obs.triggerEvent('test2', 'c', 'd');

         expect(res1).toEqual(['a', 'b']);
         expect(res2).toEqual(['c', 'd']);
      });

      it('should not notify observers not matching events given', function() {
         var fn1 = jasmine.createSpy(), fn2 = jasmine.createSpy(), fn3 = jasmine.createSpy();

         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.observe('test3', fn3);
         obs.triggerEvent(['test1', 'test2'], true);

         expect(fn1.calls.count()).toBe(1);
         expect(fn2.calls.count()).toBe(1);
         expect(fn3).not.toHaveBeenCalled();
      });
   });

   describe('#observe', function() {
      it('should call function with the correct context', function() {
         var x, y = new Date();
         function fn() {
           /*jshint validthis:true */
           x = this;
         }

         var obs = new Observable(['test']);
         obs.observe('test', fn, y);
         obs.triggerEvent('test', 'hello');

         expect(x).toBe(y);
      });

      it('should call the cancelFn after stopObserving is invoked', function() {
         var fn = jasmine.createSpy();
         var xfn = function() {};

         var obs = new Observable(['test']);
         obs.observe('test', xfn, fn);
         obs.stopObserving('test', xfn);

         expect(fn).toHaveBeenCalledWith(null, jasmine.any(Object));
      });
   });

   describe('#stopObserving', function() {
      it('should remove all observers if passed no arguments', function() {
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving();

         expect(obs.getObservers('test1')).toBeEmpty();
         expect(obs.getObservers('test2')).toBeEmpty();
         expect(obs.getObservers()).toBeEmpty();
      });

      it('should remove all observers for one event if passed only an event', function() {
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving('test2');

         expect(obs.getObservers('test1')).toHaveLength(1);
         expect(obs.getObservers('test2')).toBeEmpty();
      });

      it('should remove all events for callback if only passed a callback', function() {
         function fn1() {}
         function fn2() {}

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn1);
         obs.observe('test2', fn2);
         obs.stopObserving(fn1);

         expect(obs.getObservers('test1')).toBeEmpty();
         expect(obs.getObservers('test2')).toHaveLength(1);
         expect(obs.getObservers('test2')[0].fn).toBe(fn2);
      });

      it('should remove one observer if passed all arguments', function() {
         var ctx1 = {},
            ctx2 = {},
            a = function() {},
            b = function() {};

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', a, ctx1);
         obs.observe('test2', a, ctx1);
         obs.observe('test1', b, ctx1);
         obs.observe('test1', a, ctx2);
         obs.stopObserving('test1', a, ctx1);

         expect(obs.getObservers('test2')).toHaveLength(1);
         expect(obs.getObservers('test1')).toHaveLength(2);
      });

      it('should accept an array for events', function() {
         var a = function() {},
            b = function() {};

         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test1', a);
         obs.observe('test2', a);
         obs.observe('test2', b);
         obs.observe('test3', a);
         obs.stopObserving(['test1', 'test2'], a);

         expect(obs.getObservers('test1')).toHaveLength(0);
         expect(obs.getObservers('test2')).toHaveLength(1);
         expect(obs.getObservers('test3')).toHaveLength(1);
      });

      it('should accept Observer for callback and remove appropriately', function() {
         var a = function() {},
             b = function() {},
             c = function() {};

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', a);
         obs.observe('test1', b);
         obs.observe('test1', c);
         obs.observe('test2', a);
         obs.observe('test2', b);
         var list = obs.getObservers('test1');
         expect(list).toHaveLength(3);
         expect(obs.getObservers('test2')).toHaveLength(2);

         obs.stopObserving(b);

         expect(obs.getObservers('test1')).toHaveLength(2);
         expect(obs.getObservers('test1')[0].fn).toBe(a);
         expect(obs.getObservers('test1')[1].fn).toBe(c);
         expect(obs.getObservers('test2')).toHaveLength(1);
         expect(obs.getObservers('test2')[0].fn).toBe(a);
      });
   });

   describe('#hasObservers', function() {
      it('should return true if observer registered', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers('test2')).toBe(true);
      });

      it('should return false in no observer registered', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers('test1')).toBe(false);
      });

      it('should accept an array of events', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers(['test2', 'test3'])).toBe(true);
         expect(obs.hasObservers(['test1', 'test3'])).toBe(false);
      });

      it('should return true if any observers are registered assuming no args given', function() {
         var b = function() {};
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', b);
         expect(obs.hasObservers()).toBe(true);
      });

      it('should return false in no observers registered with no args given', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         expect(obs.hasObservers()).toBe(false);
      });
   });

   describe('#getObservers', function() {
      it('should produce a warning if not a valid event', function() {
         var oldWarn = fbutil.warn;
         var spy = spyOn(fbutil.log, 'warn');
         var obs = new Observable(['apples']);
         expect(obs.getObservers('oranges')).toEqual([]);
         expect(spy.calls.count()).toBe(1);
         fbutil.warn = oldWarn;
      });

      it('should return an array of all observers if no arguments', function() {
         var a = function() {},
             b = function() {};
         var obs = new Observable(['test1', 'test2', 'test3', 'test4']);
         obs.observe('test1', a);
         obs.observe('test1', b);
         obs.observe('test2', a);
         obs.observe('test3', b);
         var res = fbutil.map(obs.getObservers(), function(ob) { return ob.fn; });
         expect(res).toEqual([a, b, a, b]);
      });

      it('should accept an array of events', function() {
         var a = function() {}, b = function() {};
         var obs = new Observable(['test1', 'test2', 'test3', 'test4']);
         obs.observe('test1', a);
         obs.observe('test1', b);
         obs.observe('test2', a);
         obs.observe('test3', b);
         var res = fbutil.map(obs.getObservers(['test1', 'test3', 'test4']), function(ob) { return ob.fn; });
         expect(res).toEqual([a, b, b]);
      });

      it('should return empty array if no items for event', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test1', function() {});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         var res = obs.getObservers('test3');
         expect(res).toEqual([]);
      });
   });

   describe('onAdd', function() {
      it('should be called when observer added', function() {
         var fn = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {onAdd: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         expect(fn.calls.count()).toBe(2);
         expect(fn.calls.argsFor(0)[0]).toBe('test1');
         expect(fn.calls.argsFor(1)[0]).toBe('test2');
      });
   });

   describe('onRemove', function() {
      it('should be called when an observer is removed', function() {
         var fn = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {onRemove: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving();
         expect(fn.calls.count()).toBe(2);
         expect(fn.calls.argsFor(0)[0]).toBe('test1');
         expect(fn.calls.argsFor(1)[0]).toBe('test2');
      });
   });

   describe('onEvent', function() {
      it('should be called when triggerEvent occurs', function() {
         var fn = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {onEvent: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.triggerEvent(['test1', 'test2']);
         obs.triggerEvent('test2');
         expect(fn.calls.count()).toBe(3);
         expect(fn.calls.argsFor(0)[0]).toBe('test1');
         expect(fn.calls.argsFor(1)[0]).toBe('test2');
         expect(fn.calls.argsFor(2)[0]).toBe('test2');
      });
   });

   describe('observeOnce', function() {
      it('should only be invoked once', function() {
         var fn = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2']);
         obs.observeOnce('test1', fn);
         obs.triggerEvent('test1');
         obs.triggerEvent('test1');
         obs.triggerEvent('test1');
         expect(fn.calls.count()).toBe(1);
      });
   });

   describe('isOneTimeEvent', function() {
      it('should invoke all listeners first time triggered', function() {
         var fn1 = jasmine.createSpy();
         var fn2 = jasmine.createSpy();
         var fn3 = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {oneTimeEvents: ['test1']});
         obs.observeOnce('test1', fn1);
         obs.observeOnce('test1', fn2);
         obs.observeOnce('test1', fn3);
         obs.triggerEvent('test1');
         expect(fn1.calls.count()).toBe(1);
         expect(fn2.calls.count()).toBe(1);
         expect(fn3.calls.count()).toBe(1);
      });

      it('should immediately invoke any listener attached after it has been triggered', function() {
         var fn1 = jasmine.createSpy();
         var fn2 = jasmine.createSpy();
         var fn3 = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {oneTimeEvents: ['test1']});
         obs.observeOnce('test1', fn1);
         obs.triggerEvent('test1');
         obs.observeOnce('test1', fn2);
         obs.observeOnce('test1', fn3);
         expect(fn1.calls.count()).toBe(1);
         expect(fn2.calls.count()).toBe(1);
         expect(fn3.calls.count()).toBe(1);
      });

      it('should only ever invoke a listener once', function() {
         var fn1 = jasmine.createSpy();
         var fn2 = jasmine.createSpy();
         var obs = new Observable(['test1', 'test2'], {oneTimeEvents: ['test1']});
         obs.observeOnce('test1', fn1);
         obs.triggerEvent('test1');
         obs.observeOnce('test1', fn2);
         obs.triggerEvent('test1');
         obs.triggerEvent('test1');
         expect(fn1.calls.count()).toBe(1);
         expect(fn2.calls.count()).toBe(1);
      });
   });

});