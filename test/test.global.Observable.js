var fb = require('../firebase-utils.js')._ForTestingOnly;
var helpers = require('./util/test-helpers.js');
var sinonChai = require('sinon-chai');
var expect = require('chai').use(sinonChai).expect;
var sinon = require('sinon');

describe('global.Observable.js', function() {
   var Observable = fb.util.Observable;

   describe('#triggerEvent', function() {
      it('should notify all observers', function() {
         var fn1 = sinon.spy(), fn2 = sinon.spy();
         var obs = new Observable(['test']);
         obs.observe('test', fn1);
         obs.observe('test', fn2);
         obs.triggerEvent('test', 'hi');
         expect(fn1).to.be.calledWith('hi');
         expect(fn2).to.be.calledWith('hi');
      });

      it('should accept an array of events', function() {
         var fn1 = sinon.spy(), fn2 = sinon.spy();
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.triggerEvent(['test1', 'test2'], 'hello');
         expect(fn1).to.be.calledWith('hello');
         expect(fn2).to.be.calledWith('hello');
      });

      it('should pass additional arguments to the callbacks', function() {
         var res1 = 0, res2 = 0;
         function fn1() { res1 = fb.util.toArray(arguments); }
         function fn2() { res2 = fb.util.toArray(arguments); }

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.triggerEvent('test1', 'a', 'b');
         obs.triggerEvent('test2', 'c', 'd');

         expect(res1).to.eql(['a', 'b']);
         expect(res2).to.eql(['c', 'd']);
      });

      it('should not notify observers not matching events given', function() {
         var fn1 = sinon.spy(), fn2 = sinon.spy(), fn3 = sinon.spy();

         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn2);
         obs.observe('test3', fn3);
         obs.triggerEvent(['test1', 'test2'], true);

         expect(fn1).to.be.calledOnce;
         expect(fn2).to.be.calledOnce;
         expect(fn3).to.not.be.called;
      });
   });

   describe('#observe', function() {
      it('should call function with the correct context', function() {
         var x, y = new Date();
         function fn() { x = this; }

         var obs = new Observable(['test']);
         obs.observe('test', fn, y);
         obs.triggerEvent('test', 'hello');

         expect(x).to.equal(y);
      });

      it('should call the cancelFn after stopObserving is invoked', function() {
         var fn = sinon.spy();
         var xfn = function() {};

         var obs = new Observable(['test']);
         obs.observe('test', xfn, fn);
         obs.stopObserving('test', xfn);

         expect(fn).to.be.calledWith(null);
      });
   });

   describe('#stopObserving', function() {
      it('should remove all observers if passed no arguments', function() {
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving();

         expect(obs.getObservers('test1')).to.be.empty;
         expect(obs.getObservers('test2')).to.be.empty;
         expect(obs.getObservers()).to.be.empty;
      });

      it('should remove all observers for one event if passed only an event', function() {
         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving('test2');

         expect(obs.getObservers('test1')).to.have.length(1);
         expect(obs.getObservers('test2')).to.be.empty;
      });

      it('should remove all events for callback if only passed a callback', function() {
         function fn1() {}
         function fn2() {}

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', fn1);
         obs.observe('test2', fn1);
         obs.observe('test2', fn2);
         obs.stopObserving(fn1);

         expect(obs.getObservers('test1')).to.be.empty;
         expect(obs.getObservers('test2')).to.have.length(1);
         expect(obs.getObservers('test2')[0].fn).to.equal(fn2);
      });

      it('should remove one observer if passed all arguments', function() {
         var ctx1 = new function() {},
            ctx2 = new function() {},
            a = function() {},
            b = function() {};

         var obs = new Observable(['test1', 'test2']);
         obs.observe('test1', a, ctx1);
         obs.observe('test2', a, ctx1);
         obs.observe('test1', b, ctx1);
         obs.observe('test1', a, ctx2);
         obs.stopObserving('test1', a, ctx1);

         expect(obs.getObservers('test2')).to.have.length(1);
         expect(obs.getObservers('test1')).to.have.length(2);
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

         expect(obs.getObservers('test1')).to.have.length(0);
         expect(obs.getObservers('test2')).to.have.length(1);
         expect(obs.getObservers('test3')).to.have.length(1);
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

         expect(obs.getObservers('test1')).to.have.length(3);
         expect(obs.getObservers('test2')).to.have.length(2);

         obs.stopObserving(b);

         expect(obs.getObservers('test1')).to.have.length(2);
         expect(obs.getObservers('test1')[0].fn).to.equal(a);
         expect(obs.getObservers('test1')[1].fn).to.equal(c);
         expect(obs.getObservers('test2')).to.have.length(1);
         expect(obs.getObservers('test2')[0].fn).to.equal(a);
      });
   });

   describe('#hasObservers', function() {
      it('should return true if observer registered', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers('test2')).to.be.true;
      });

      it('should return false in no observer registered', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers('test1')).to.be.false;
      });

      it('should accept an array of events', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', function() {});
         expect(obs.hasObservers(['test2', 'test3'])).to.be.true;
         expect(obs.hasObservers(['test1', 'test3'])).to.be.false;
      });

      it('should return true if any observers are registered assuming no args given', function() {
         var a = new fb.util.Observer(['test1', 'test2'], function() {}),
            b = function() {},
            c = function() {};
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test2', b);
         expect(obs.hasObservers()).to.be.true;
      });

      it('should return false in no observers registered with no args given', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         expect(obs.hasObservers()).to.be.false;
      });
   });

   describe('#getObservers', function() {
      it('should produce a warning if not a valid event', function() {
         var spy = sinon.stub(fb.log, 'warn');
         var obs = new Observable(['apples']);
         expect(obs.getObservers('oranges')).to.eql([]);
         expect(spy).to.be.calledOnce;
         spy.restore();
      });

      it('should return an array of all observers if no arguments', function() {
         var a = function() {},
             b = function() {};
         var obs = new Observable(['test1', 'test2', 'test3', 'test4']);
         obs.observe('test1', a);
         obs.observe('test1', b);
         obs.observe('test2', a);
         obs.observe('test3', b);
         var res = fb.util.map(obs.getObservers(), function(ob) { return ob.fn });
         expect(res).to.eql([a, b, a, b]);
      });

      it('should accept an array of events', function() {
         var a = function() {}, b = function() {};
         var obs = new Observable(['test1', 'test2', 'test3', 'test4']);
         obs.observe('test1', a);
         obs.observe('test1', b);
         obs.observe('test2', a);
         obs.observe('test3', b);
         var res = fb.util.map(obs.getObservers(['test1', 'test3', 'test4']), function(ob) { return ob.fn });
         expect(res).to.eql([a, b, b]);
      });

      it('should return empty array if no items for event', function() {
         var obs = new Observable(['test1', 'test2', 'test3']);
         obs.observe('test1', function() {});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         var res = obs.getObservers('test3');
         expect(res).to.eql([]);
      });
   });

   describe('onAdd', function() {
      it('should be called when observer added', function() {
         var fn = sinon.spy();
         var obs = new Observable(['test1', 'test2'], {onAdd: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         expect(fn).to.be.calledTwice;
         expect(fn.firstCall.args[0]).to.equal('test1');
         expect(fn.secondCall.args[0]).to.equal('test2');
      });
   });

   describe('onRemove', function() {
      it('should be called when an observer is removed', function() {
         var fn = sinon.spy();
         var obs = new Observable(['test1', 'test2'], {onRemove: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.stopObserving();
         expect(fn).to.be.calledTwice;
         expect(fn.firstCall.args[0]).to.equal('test1');
         expect(fn.secondCall.args[0]).to.equal('test2');
      });
   });

   describe('onEvent', function() {
      it('should be called when triggerEvent occurs', function() {
         var fn = sinon.spy();
         var obs = new Observable(['test1', 'test2'], {onEvent: fn});
         obs.observe('test1', function() {});
         obs.observe('test2', function() {});
         obs.triggerEvent(['test1', 'test2']);
         obs.triggerEvent('test2');
         expect(fn).to.be.calledThrice;
         expect(fn.firstCall.args[0]).to.equal('test1');
         expect(fn.secondCall.args[0]).to.equal('test2');
         expect(fn.thirdCall.args[0]).to.equal('test2');
      });
   });

});