
var expect = require('chai').expect;
var fb = require('../firebase-utils.js')._ForTestingOnly;
var helpers = require('./util/test-helpers.js');
var data = require('./util/data.join.json');

describe('join.JoinedRecord', function() {
   var JoinedRecord = fb.join.JoinedRecord;

   beforeEach(function(done){
      helpers.reset(data, done);
   });

   afterEach(helpers.unauth);

   describe('<constructor>', function() {
      it('should throw an error if there are no Firebase refs (cannot all be dynamic functions)', function() {
         expect(function() {
            new JoinedRecord({ref: function() {}, keyMap: { hello: 'world' }, pathName: 'test'});
         }).to.throw(Error, /no valid Firebase/i);
      });

      it('should throw an error if passed a dynamic ref and there is no pathName', function() {
         expect(function() {
            new JoinedRecord({ref: function() {}, keyMap: { foo: 'bar' }});
         }).to.throw(Error, /pathName/);
      });

      it('should throw an error if passed a dynamic ref and there is no keyMap', function() {
         expect(function() {
            new JoinedRecord({ref: function() {}, pathName: 'test'});
         }).to.throw(Error, /keyMap/);
      });
   });

   describe('#auth', function() {
      it('should invoke callback with err if not successful', function(done) {
         new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).auth('not a valid secret', function(err, auth) {
            expect(err).to.exist;
            done();
         });
      });

      it('should succeed with a valid token', function(done) {
         new JoinedRecord(helpers.ref('test')).auth(helpers.tok('test-user'), function(err) {
            expect(err).not.to.exist;
            done();
         });
      });

      it('should cause .info/authenticated to be true', function(done) {
         new JoinedRecord(helpers.ref('test')).auth(helpers.tok('test-user'), function() {
            helpers.chain()
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
         helpers.chain()
            .auth('test-user')
            .get('.info/authenticated')
            .then(function(v) {
               expect(v).to.be.true;
               new JoinedRecord(helpers.ref('path1')).unauth();
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
         new JoinedRecord(helpers.ref('account/kato')).on('value', function(snap) {
            snap.ref().off();
            expect(snap).to.be.instanceof(fb.join.JoinedSnapshot);
            done();
         });
      });

      it('should merge data in order paths were added', function(done) {
         new JoinedRecord(helpers.ref('account'), helpers.ref('profile')).on('value', function(snap) {
            expect(snap.val()).to.deep.equal({
               "bruce": {
                  "email": "bruce@lee.com",
                  "name": "Bruce Lee",
                  "nick": "Little Phoenix",
                  "style": "Jeet Kune Do"
               },
               "kato": {
                  "email": "wulf@firebase.com",
                  "name": "Michael Wulf",
                  "nick": "Kato",
                  "style": "Kung Fu"
               }
            });
            snap.ref().off();
            done();
         });
      });

      it('should work with primitives', function(done) {
         new JoinedRecord(helpers.ref('unions/fruit'), helpers.ref('unions/legume')).on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).to.deep.equal({
               a: { fruit: "apple" },
               b: { fruit: "banana", legume: "baked beans" },
               c: { legume: "chickpeas" },
               d: { legume: "dry-roasted peanuts" }
            });
            done();
         });
      });

      it('should put values in correct keys if keyMap overrides them', function(done) {
         new JoinedRecord(helpers.ref('unions/fruit'), helpers.ref('unions/legume')).on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).to.deep.equal({
               a: { fruit: "apple" },
               b: { fruit: "banana", legume: "baked beans" },
               c: { legume: "chickpeas" },
               d: { legume: "dry-roasted peanuts" }
            });
            done();
         });
      });

      it.only('should call "value" on a child_added event', function(done) {
         helpers.debugThisTest(null); //debug

         function setVal(snap) {
            expect(snap.val()).to.deep.equal({
               "bruce": {
                  "email": "bruce@lee.com",
                  "name": "Bruce Lee",
                  "nick": "Little Phoenix",
                  "style": "Jeet Kune Do"
               },
               "kato": {
                  "email": "wulf@firebase.com",
                  "name": "Michael Wulf",
                  "nick": "Kato",
                  "style": "Kung Fu"
               }
            });
            step = verify;
            helpers.ref('account/john').set({name: 'john'});
         }

         var ct = 0;
         function verify(snap) {
            snap.ref().off();
            expect(snap.val()).to.deep.equal({
               "bruce": {
                  "email": "bruce@lee.com",
                  "name": "Bruce Lee",
                  "nick": "Little Phoenix",
                  "style": "Jeet Kune Do"
               },
               "kato": {
                  "email": "wulf@firebase.com",
                  "name": "Michael Wulf",
                  "nick": "Kato",
                  "style": "Kung Fu"
               },
               "john": {
                  "name": "john"
               }
            });
            done();
         }

         var step = setVal;

         new JoinedRecord(helpers.ref('account'), helpers.ref('profile')).on('value', function(snap) {
            // the first time this is called with empty callback to skip the pre-add notification
            step(snap);
         });
      });

      it('should call "value" on a child_removed event');

      it('should call "value" on a child_changed event');

      it('should call "value" on a child_moved event');

      it('should be union if no intersecting paths are declared');

      it('should not call child_added until all intersecting paths exist');

      it('should not call child_removed until all intersecting paths are removed');

      it('should call child_added for any preloaded records when on() is declared');

      it('should not call child_removed until last path is removed if no intersecting paths (a union)');

      it('should accept a single path');

      it('should accept paths that don\'t exist (that just return null)');

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
            new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).onDisconnect();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#limit', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).limit();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#endAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).endAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#startAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).startAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#transaction', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            new JoinedRecord(helpers.ref('path1'), helpers.ref('path2')).transaction();
         }).to.throw(fb.NotSupportedError);
      });
  });

});