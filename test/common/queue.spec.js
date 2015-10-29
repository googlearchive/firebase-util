'use strict';
var fbutil = require('../../src/common');

describe('common/Queue.js', function() {

   describe('#handler', function() {
      it('should call handler callback with null if the queue has no errors', function() {
         var q = fbutil.queue();
         var handler = q.getHandler();

         var callback =  jasmine.createSpy();

         q.handler(callback);

         expect(q.hasErrors()).toBe(0);

         handler();

         expect(q.hasErrors()).toBe(0);
         expect(callback).toHaveBeenCalledWith(null);
      });

      it('should call handler callback with the first error if the queue has errors', function() {
         var q = fbutil.queue();
         var handler = q.getHandler();

         var callback =  jasmine.createSpy();
         var error = new Error();

         q.handler(callback);

         expect(q.hasErrors()).toBe(0);

         handler(error);

         expect(q.hasErrors()).toBe(1);
         expect(callback).toHaveBeenCalledWith(error);
      });
   });

});