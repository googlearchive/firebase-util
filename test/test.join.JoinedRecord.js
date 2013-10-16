
var expect = require('chai').expect;
var fb = require('../firebase-utils.js')._ForTestingOnly;
var utils = require('./util/test.util.js');
var data = require('./util/data.join.json');

describe('join.JoinedRecord', function() {
   var JoinedRecord = fb.join.JoinedRecord;

   before(function(done){
//      utils.chain().sup().set(null, data).unauth().testDone(done);
      utils.chain().set(null, data).testDone(done);
   });

   after(function() {
      utils.unauth();
   });

   describe('<constructor>', function() {
      it('should throw an error if there are no Firebase refs (cannot all be dynamic functions)', function() {
         expect(function() {
            new JoinedRecord(function() {});
         }).to.throw(Error, /[Nn]o valid Firebase ref/);
      });
   });

   describe('#auth', function() {
      it('should invoke callback with err if not successful', function(done) {
         new JoinedRecord(utils.ref('path1'), utils.ref('path2')).auth('not a valid secret', function(err, auth) {
            expect(err).to.exist;
            done();
         });
      });

      it('should succeed with a valid token', function(done) {
         new JoinedRecord(utils.ref()).auth(utils.tok('test-user'), function(err) {
            expect(err).not.to.exist;
            done();
         });
      });

      it('should cause .info/authenticated to be true', function(done) {
         new JoinedRecord(utils.ref()).auth(utils.tok('test-user'), function() {
            utils.chain()
               .get('.info/authenticated')
               .then(function(v) {
                  expect(v).to.be.true;
               })
               .testDone(done);
         });
      });
   });

   describe('#unauth', function() {
      it('should cause .info/authenticated to become false', function(done) {
         utils.chain()
            .auth('test-user')
            .get('.info/authenticated')
            .then(function(v) {
               expect(v).to.be.true;
               new JoinedRecord(utils.ref('path1')).unauth();
            })
            .get('.info/authenticated')
            .then(function(v) {
               expect(v).to.be.false;
            })
            .testDone(done);
      });
   });

   describe('#on', function() {
      it('should return a JoinedSnapshot', function(done) {
         new JoinedRecord(utils.ref('account')).on('value', function(snap) {
            expect(snap).to.be.instanceof(fb.join.JoinedSnapshot);
            snap.ref().off();
            done();
         });
      });

      it('should merge data in order paths were added');

      it('should update when a record is added later');

      it('should not call child_added until all intersecting paths exist');

      it('should not call child_removed until all intersecting paths are removed');

      it('should call child_added immediately if there are no intersecting paths (a union)');

      it('should not call child_removed until last path is removed if no intersecting paths (a union)');

      it('should accept a single path');

      it('should accept paths that don\'t exist (that just return null)');

      it('should return everything for value');

      it('should call value on a child_added event');

      it('should call value on a child_removed event');

      it('should call value on a child_changed event');

      it('should call value on a child_moved event');

      it('should be union if no intersecting paths are declared');

      it('should return null if any intersecting path is null');

      it('should return only children in all intersecting paths');

      it('should merge data from a dynamic path (function)');

      it('should sort data according to first sortBy path');

      it('should invoke the cancel callback for all listeners if canceled');
  });

   describe('#off', function() {
      it('should be tested');
  });

   describe('#once', function() {
      it('should be tested');
  });

   describe('#child', function() {
      it('should be tested');
  });

   describe('#parent', function() {
      it('should be tested');
  });

   describe('#name', function() {
      it('should be tested');
  });

   describe('#set', function() {
      it('should be tested');
  });

   describe('#setWithPriority', function() {
      it('should be tested');
  });

   describe('#setPriority', function() {
      it('should be tested');
  });

   describe('#update', function() {
      it('should be tested');
  });

   describe('#remove', function() {
      it('should be tested');
  });

   describe('#push', function() {
      it('should be tested');
  });

   describe('#root', function() {
      it('should be tested');
  });

   describe('#toString', function() {
      it('should be tested');
  });

   describe('#ref', function() {
      it('should be tested');
  });

   describe('#onDisconnect', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(utils.ref('path1'), utils.ref('path2')).onDisconnect();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#limit', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(utils.ref('path1'), utils.ref('path2')).limit();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#endAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(utils.ref('path1'), utils.ref('path2')).endAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#startAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(utils.ref('path1'), utils.ref('path2')).startAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#transaction', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(utils.ref('path1'), utils.ref('path2')).transaction();
         }).to.throw(fb.NotSupportedError);
      });
  });

});