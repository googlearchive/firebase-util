
var sinonChai = require('sinon-chai');
var expect = require('chai').use(sinonChai).expect;
var sinon = require('sinon');
var fb = require('../firebase-utils.js')._ForTestingOnly;
var helpers = require('./util/test-helpers.js');
var data = require('./util/data.join.json');
var JQDeferred = require('JQDeferred');
var Firebase = require('firebase');

describe('join.JoinedRecord', function() {
   var JoinedRecord = fb.join.JoinedRecord;

   beforeEach(function(done){
      helpers.reset(data, done);
   });

   afterEach(helpers.unauth);

   describe('<constructor>', function() {
      it('should accept a single path', function(done) {
         new JoinedRecord(helpers.ref('users/account')).once('value', function(snap) {
            expect(snap.val()).keys(['bruce', 'kato']);
            done();
         })
      });

      it('should accept paths that don\'t exist (that just return null)', function(done) {
         new JoinedRecord({ref: helpers.ref('notrealz/a/z/a/z/a'), keyMap: ['abc']}).once('value', function(snap) {
            expect(snap.val()).to.be.null;
            done();
         });
      });
   });

   describe('#auth', function() {
      it('should invoke callback with err if not successful', function(done) {
         createJoinedRecord('unions/fruit', 'unions/legume').auth('not a valid secret', function(err, auth) {
            expect(err).to.exist;
            done();
         });
      });

      it('should succeed with a valid token', function(done) {
         createJoinedRecord('unions/fruit').auth(helpers.tok('test-user'), function(err) {
            expect(err).not.to.exist;
            done();
         });
      });

      it('should cause .info/authenticated to be true', function(done) {
         createJoinedRecord('unions/fruit').auth(helpers.tok('test-user'), function() {
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
               createJoinedRecord('unions/fruit').unauth();
            })
            .pause()
            .get('.info/authenticated')
            .then(function(v) {
               expect(v).to.be.false;
            })
            .testDone(done);
      });
   });

   describe('#on', function() {
      it('should return the callback function', function() {
         var fn = sinon.stub();
         var rec = createJoinedRecord('users/account', 'users/profile');
         var res = rec.on('value', fn);
         expect(res).to.equal(fn);
         rec.off();
      });

      it('should pass a JoinedSnapshot to the callback', function(done) {
         createJoinedRecord('users/account').on('value', function(snap) {
            snap.ref().off();
            expect(snap).to.be.instanceof(fb.join.JoinedSnapshot);
            done();
         });
      });

      it('should merge data in order paths were added', function(done) {
         createJoinedRecord('users/account', 'users/profile').on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).to.eql({
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
            done();
         });
      });

      it('should invoke child_added if add to empty path', function(done) {
         var rec = createJoinedRecord({ ref: helpers.ref('empty_path/one'), keyMap: ['a', 'b']}, {ref: helpers.ref('empty_path/two'), keyMap: ['c', 'd']});
         rec.on('child_added', function(snap) {
            snap.ref().off();
            expect(snap.name()).to.equal('foo');
            expect(snap.val()).to.eql({c: 'c'});
            done();
         });
         rec.once('value', function(snap) {
            expect(snap.val()).to.be.null;
            helpers.ref('empty_path/two/foo/c').set('c');
         });
      });

      it('should invoke child_removed on remove', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         rec.on('child_removed', function(snap) {
            snap.ref().off();
            expect(snap.name()).to.equal('kato');
            expect(snap.val()).to.eql({
               "email": "wulf@firebase.com",
               "name": "Michael Wulf",
               "nick": "Kato",
               "style": "Kung Fu"
            });
            done();
         });
         rec.once('value', function(snap) {
            helpers.ref('users/account/kato').remove();
            helpers.ref('users/profile/kato').remove();
         });
      });

      it('should invoke child_changed on change', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         rec.on('child_changed', function(snap) {
            snap.ref().off();
            expect(snap.name()).to.equal('kato');
            expect(snap.val()).to.eql({
               "email": "wulf@firebase.com",
               "name": "Michael Wulf",
               "nick": "Kato!",
               "style": "Kung Fu"
            });
            done();
         });
         rec.once('value', function(snap) {
            helpers.wait(function() {
               helpers.ref('users/profile/kato/nick').set('Kato!');
            }, 100);
         });
      });

      it('should invoke child_moved on move', function(done) {
         var rec = createJoinedRecord('ordered/set1', 'ordered/set2');
         rec.on('child_moved', function(snap) {
            snap.ref().off();
            expect(snap.name()).to.equal('three');
            expect(snap.getPriority()).to.equal(25);
            done();
         });
         rec.once('value', function() {
            helpers.ref('ordered/set1/three').setPriority(25);
         });
      });

      it('should put primitives into field named by path', function(done) {
         createJoinedRecord('unions/fruit', 'unions/legume').on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).to.eql({
               a: { fruit: "apple" },
               b: { fruit: "banana", legume: "baked beans" },
               c: { legume: "chickpeas" },
               d: { legume: "dry-roasted peanuts" }
            });
            done();
         });
      });

      it('If keyMap specified, should put primitives into that field', function(done) {
         createJoinedRecord(
            {ref: helpers.ref('unions/fruit'), keyMap: {'.value': 'フルーツ'}},
            'unions/legume'
         ).on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).to.eql({
               a: { 'フルーツ': "apple" },
               b: { 'フルーツ': "banana", legume: "baked beans" },
               c: { legume: "chickpeas" },
               d: { legume: "dry-roasted peanuts" }
            });
            done();
         });
      });

      it('should call "child_added" for all pre-loaded recs', function(done) {
         var keys;
         var rec = createJoinedRecord('users/account', 'users/profile');

         function fn(snap) {
            expect(snap.name()).to.equal(keys.shift());
            if( !keys.length ) { done(); }
         }

         rec.once('value', function(snap) {
            keys = fb.util.keys(snap.val());
            expect(keys).length.greaterThan(0);
            // wait for the recs to load, then try child_added against them
            rec.on('child_added', fn);
         });

      });

      it('should call "value" on a child_added event', function(done) {
         function setVal(snap) {
            expect(snap.val()).to.eql({
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
            helpers.ref('users/account/john').set({name: 'john', email: 'john@john.com'});
         }

         function verify(snap) {
            snap.ref().off();
            expect(snap.val()).to.eql({
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
                  // the name will lose out to the profile path (which has none)
                  // so all we get is an email
                  "email": "john@john.com"
               }
            });
            done();
         }

         var step = setVal;

         createJoinedRecord('users/account', 'users/profile')
            .on('value', function(snap) {
               // the first time this is called with empty callback to skip the pre-add notification
               step(snap);
            });
      });

      it('should call "value" on a child_removed event', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         var fn = step1;

         function step1(snap) {
            fn = step2;
            helpers.ref('users/account/kato').remove();
            helpers.ref('users/profile/kato').remove();
         }

         function step2(snap) {
            expect(snap.val()).not.keys('kato');
            done();
         }

         rec.on('value', function(snap) {
            fn(snap);
         });
      });

      it('should call "value" on a child_changed event', function(done) {
         var ref = createJoinedRecord('users/profile', 'users/account'), fn = step1;
         function step1(snap) {
            fn = step2;
            helpers.ref('users/profile/kato/nick').set('Kato!');
         }
         function step2(snap) {
            snap.ref().off();
            expect(snap.val()).keys(['bruce', 'kato']);
            expect(snap.val().kato.nick).to.equal('Kato!');
            done();
         }
         ref.on('value', function(snap) {
            fn(snap);
         });
      });

      it('should call "value" on a child_moved event', function(done) {
         var ref = createJoinedRecord('ordered/set1', 'ordered/set2'), fn = step1;
         function step1() {
            fn = step2;
            helpers.ref('ordered/set1/two').setPriority(10);
         }
         function step2(snap) {
            snap.ref().off();
            expect(snap.val()).keys(['one', 'three', 'four', 'five', 'two']);
            expect(snap.val()['two']).to.eql({set1: 2, set2: 22});
            done();
         }
         ref.on('value', function(snap) { fn(snap); });
      });

      it('should be union if no intersecting paths are declared', function(done) {
         var ref = createJoinedRecord('unions/fruit', 'unions/legume', 'unions/veggie');
         ref.on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).keys(['a', 'b', 'c', 'd', 'e']);
            done();
         });
      });

      it('should call "child_added" for any preloaded records when on() is declared', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile'), vals = ['bruce', 'kato'];
         ref.on('child_added', function(snap) {
            expect(snap.name()).to.equal(vals.shift());
            if( vals.length === 0 ) {
               setTimeout(done, 100);
            }
         });
      });

      it('should not call child_removed until last path is removed if a union', function(done) {
         var ref = createJoinedRecord('unions/fruit', 'unions/legume', 'unions/veggie'), ready = false;
         ref.on('child_removed', function(snap) {
            ref.off();
            if( !ready ) {
               console.error('child_removed event, but still existing unions', snap.name(), snap.val());
               throw new Error('child_removed event, but still existing unions');
            }
            else {
               done();
            }
         });

         function rem(path) {
            return JQDeferred(function(def) {
               helpers.set(path, null).then(function() {
                  setTimeout(def.resolve, 10); // give a little wait for events to be fired
               });
            });
         }

         ref.once('value', function() {
            rem('unions/fruit/b')
               .then(rem.bind(null, 'unions/legume/b'))
               .done(function() { ready = true; })
               .then(rem.bind(null, 'unions/veggie/b'));
         });
      });

      it('"value" should return null if any intersecting path is null and is a joined parent', function(done) {
         var ref = newIntersection(['unions/fruit', 'unions/legume', {ref: helpers.ref('unions/notrealz'), keyMap: ['abc']}]);
         ref.once('value', function(snap) {
            expect(snap.val()).to.be.null;
            done();
         })
      });

      it('"value" should return null if any intersecting path is null and is a joined child', function(done) {
         var ref = newIntersection(['unions/fruit', 'unions/legume', 'unions/veggie']).child('d');
         ref.on('value', function(snap) {
            ref.off();
            expect(snap.val()).to.be.null;
            done();
         })
      });

      it('"value" should only include children which exist in all intersecting paths', function(done) {
         var ref = newIntersection(['unions/fruit', 'unions/legume', 'unions/veggie']);
         ref.on('value', function(snap) {
            expect(snap.val()||{}).keys(['b']);
            done();
         })
      });

      it('should not call child_added until all intersecting paths exist', function(done) {
         helpers.set('unions', { fruit: {aa: 'aa'}, legume: {bb: 'bb'}, veggie: {cc: 'cc'} }).then(function() {
            var ref = newIntersection(['unions/fruit', 'unions/legume'], ['unions/veggie']);

            var keys = false;
            ref.on('child_added', function(snap) {
               if( keys === false ) {
                  console.error('snap received but is not a proper intersection', snap.val());
                  throw new Error('should not call child_added yet :(');
               }
               else {
                  expect(snap.val()).keys(keys);
               }
            });

            function nextKeys(newKeys, path, data) {
               return JQDeferred(function(def) {
                  keys = newKeys;
                  helpers.set('unions/'+path, data).done(function() {
                     setTimeout(function() {
                        def.resolve();
                     }, 10);
                  });
               });
            }

            nextKeys(false, 'fruit/a', 'apple')
               .then(nextKeys.bind(null, false, 'fruit/b', 'banana'))
               .then(nextKeys.bind(null, false, 'legume/c', 'chickpeas'))
               .then(nextKeys.bind(null, false, 'legume/d', 'dry-roasted-peanuts'))
               .then(nextKeys.bind(null, ['b'], 'veggie/b', 'broccoli'))
               .then(nextKeys.bind(null, ['b'], 'veggie/c', 'carrot'))
               .always(done);
         });
      });

      it('should call child_removed if any intersecting path is removed', function(done) {
         var ref = newIntersection(['unions/fruit', 'unions/legume'], ['unions/veggie']);
         ref.on('child_removed', function(snap) {
            expect(snap.name()).to.equal('b');
            done();
         });
         ref.once('value', function(snap) {
            expect(snap.val()).keys(['b']);
            helpers.ref('unions/legume/b').remove();
         });
      });

      it('should merge data from a dynamic keyMap ref', function(done) {
         var ref = createJoinedRecord('users/account', {ref: helpers.ref('users/profile'), keyMap: {
            name: 'name',
            nick: 'nick',
            style: helpers.ref('users/styles')
         }});

         ref.on('value', function(snap) {
            expect(snap.val()).keys(['bruce', 'kato']);
            expect(snap.val().kato).to.eql({
               email: 'wulf@firebase.com',
               name: 'Michael Wulf',
               nick: 'Kato',
               style: {
                  ".id": "Kung Fu",
                  "description": "Chinese system based on physical exercises involving animal mimicry"
               }
            });
            done();
         });
      });

      it('should not explode if dynamic keyMap ref does not exist', function(done) {
         var ref = createJoinedRecord('users/account', {ref: helpers.ref('users/profile'), keyMap: {
            name: 'name',
            nick: 'nick',
            style: {ref: helpers.ref('users/stylez'), keyMap: ['description']}
         }});

         ref.on('value', function(snap) {
            expect(snap.val()).keys(['bruce', 'kato']);
            expect(snap.val().kato).to.eql({
               email: 'wulf@firebase.com',
               name: 'Michael Wulf',
               nick: 'Kato'
            });
            done();
         });
      });

      it('should only call "value" once when using dynamic keyMap ref', function(done) {
         var cancelSpy = sinon.spy(), count = 0, to;
         var ref = createJoinedRecord('users/account', {ref: helpers.ref('users/profile'), keyMap: {
            name: 'name',
            nick: 'nick',
            style: helpers.ref('users/styles')
         }});

         ref.on('value', function() {
            // debounce every time this method is called
            count++;
            to && clearTimeout
            (to);
            setTimeout(finished, 750);
         }, cancelSpy);

         function finished() {
            expect(count).to.equal(1);
            expect(cancelSpy).not.called;
            done();
         }

      });

      it('should sort data according to first sortBy path', function(done) {
         var ref = createJoinedRecord('ordered/set1', {ref: helpers.ref('ordered/set2'), sortBy: true});
         ref.on('value', function(snap) {
            snap.ref().off();
            expect(snap.val()).keys(['five', 'one', 'two', 'three', 'four']);
            done();
         });
      });

      // can't test cancel callback because set on security rules isn't working from bash/PowerShell
      it('should invoke the cancel callback for all listeners if canceled', function(done) {
         console.log("\n\n<<< INTENTIONAL WARNINGS >>>\n");
         var cancel = fb.util.map([1, 2, 3], function() { return sinon.spy(); });
         helpers.chain()
            .then(function() {
               return JQDeferred(function(def) {
                  var ref = createJoinedRecord('secured/foo', 'secured/bar');
                  fb.util.each(cancel, function(c, k) {
                     ref.on('value', function() {}, c);
                  });
                  ref.once('value', def.resolve.bind(def), def.reject.bind(def));
               })
            })
            .set('secured_read_allowed', false)
            .wait(function() {
               fb.util.each(cancel, function(spy) {
                  expect(spy).calledOnce;
               });
            }, 1000)
            .then(function() {
               console.log("\n<<< //INTENTIONAL WARNINGS >>>\n\n");
            })
            .testDone(done);
      });

      it('should work with only child_added callback', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile');
         ref.on('child_added', function(snap) {
            ref.off(); // we only want one
            expect(snap.name()).to.equal('bruce');
            done();
         });
      });

      it('should work with only child_changed callback', function(done) {
         var spy = sinon.spy();
         createJoinedRecord('users/account', 'users/profile').on('child_changed', spy);
         helpers
            .chain()
            .get('users') // wait for data
            .pause()
            .set('users/profile/kato/nick', 'Kato!')
            .pause(function() {
               expect(spy).calledOnce;
               expect(spy.args[0][0].name()).to.equal('kato');
            })
            .testDone(done);
      });

      it('should work with only child_removed callback', function(done) {
         var spy = sinon.spy();
         createJoinedRecord('users/account', 'users/profile').on('child_removed', spy);
         helpers
            .chain()
            .get('users') // wait for data
            .pause()
            .remove('users/profile/kato')
            .remove('users/account/kato')
            .pause(function() {
               expect(spy).calledOnce;
               expect(spy.args[0][0].name()).to.equal('kato');
            })
            .testDone(done);
      });

      it('should work with only child_moved callback', function(done) {
         var spy = sinon.spy();
         createJoinedRecord('ordered/set1', 'ordered/set2').on('child_moved', spy);
         helpers
            .chain()
            .get('users') // wait for data
            .pause()
            .setPriority('ordered/set1/two', 99)
            .pause(function() {
               expect(spy).calledOnce;
               expect(spy.args[0][0].name()).to.equal('two');
               expect(spy.args[0][1]).to.equal('five');
            })
            .testDone(done);
      });

      it('should return a JoinedSnapshot if called on a child record\'s field', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('kato/nick');
         ref.on('value', function(snap) {
            ref.off();
            expect(snap).instanceOf(fb.join.JoinedSnapshot);
            expect(snap.ref()).instanceOf(JoinedRecord);
            done();
         });
      });

      it('should contain correct value if called on a child record\'s field', function(done) {
         createJoinedRecord('users/account', 'users/profile')
            .child('kato/nick')
            .on('value', function(snap) {
               snap.ref().off();
               expect(snap.val()).to.equal('Kato');
               done();
            });
      });

      it('should invoke "value" on child', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('kato');
         ref.on('value', function(snap) {
            ref.off();
            expect(snap.val()).to.eql({
               "email": "wulf@firebase.com",
               "name": "Michael Wulf",
               "nick": "Kato",
               "style": "Kung Fu"
            });
            done();
         });
      });

      it('should invoke "child_added" on child', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('kato');
         ref.on('child_added', function(snap) {
            ref.off();
            expect(snap.name()).to.equal('email');
            done();
         });
      });

      it('should invoke "child_removed" on child', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('bruce');
         ref.on('child_removed', function(snap) {
            ref.off(); // only get one
            expect(snap.name()).to.equal('nick');
            done();
         });
         helpers.ref('users/profile').once('value', function(){
            setTimeout(function() {
               helpers.ref('users/profile/bruce/nick').remove();
            }, 50);
         });
      });

      it('should invoke "child_changed" on child', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('bruce');
         ref.on('child_changed', function(snap) {
            ref.off();
            expect(snap.name()).to.equal('nick');
            expect(snap.val()).to.equal('littledragon');
            done();
         });
         helpers.ref('users/profile').once('value', function(){
            setTimeout(function() {
               helpers.ref('users/profile/bruce/nick').set('littledragon');
            }, 50);
         });
      });

      it('should invoke "child_moved" on child', function(done) {
         var ref = createJoinedRecord('users/account', 'users/profile').child('bruce');
         ref.on('child_moved', function(snap) {
            ref.off();
            expect(snap.name()).to.equal('name');
            done();
         });
         helpers.ref('users/profile').once('value', function(){
            setTimeout(function() {
               helpers.ref('users/profile/bruce/name').setPriority(10);
            }, 50);
         });
      });

      it('should not behave unexpectedly if add followed immediately by remove event', function(done) {
         var valueSpy = sinon.spy(), addedSpy = sinon.spy(), removedSpy = sinon.spy();
         var ref = createJoinedRecord('users/account', 'users/profile');
         helpers.chain().get('users').then(function(){
            setTimeout(function() {
               ref.on('value', valueSpy);
               ref.on('child_removed', removedSpy);
               ref.on('child_added', addedSpy);
               helpers.chain().set('users/account/sue', {email: 'sue@sue.com'}).set('users/account/sue', null).then(function() {
                  setTimeout(function() {
                     ref.off();
                     expect(valueSpy).calledTwice;
                     expect(addedSpy).calledThrice;
                     expect(removedSpy).calledOnce;
                     done();
                  }, 100);
               });
            }, 50);
         });
      });

      it('should return object for "value" when source is an array', function(done) {
         createJoinedRecord('arrays/english', 'arrays/spanish').on('value', function(snap) {
            expect(snap.val()).to.eql({
               0: { english: 'zero',  numero: 'cero' },
               1: { english: 'one',   numero: 'uno' },
               2: { english: 'two',   numero: 'dos' },
               3: { english: 'three', numero: 'tres' },
               4: { english: 'four',  numero: 'cuatro' },
               5: { english: 'five',  numero: 'cinco' }
            });
            done();
         });
      });

      it('should call "child_added" when source is an array', function(done) {
         var spy = sinon.spy();
         var rec = createJoinedRecord('arrays/english', 'arrays/spanish');
         rec.on('child_added', spy);
         rec.once('value', function(snap) {
            var keys = fb.util.keys(snap.val());
            sinon.assert.callCount(spy, keys.length);
            fb.util.each(keys, function(key, i) {
               expect(spy.getCall(i).args[0].name()).to.equal(key);
            });
            done();
         });
      });

      it('should call "child_removed" when source is an array', function(done) {
         var spy = sinon.spy();
         var rec = createJoinedRecord('arrays/english', 'arrays/spanish');
         rec.on('child_removed', spy);
         rec.once('value', function(snap) {
            var keys = fb.util.keys(snap.val());
            var count = 0, needed = 0;
            sinon.assert.callCount(spy, 0);
            var chain = helpers.chain();
            fb.util.each(keys, function(key, i) {
               chain = chain
                  .remove(['arrays/english', key])
                  .remove(['arrays/spanish', key]);
            });
            chain
               .wait(function() {
                  sinon.assert.callCount(spy, keys.length);
                  fb.util.each(keys, function(key, i) {
                     expect(spy.getCall(i).args[0].name()).to.equal(key);
                  });
               })
               .testDone(done);
         });
      });

      it('should call "child_moved" when source is an array', function(done) {
         var spy = sinon.spy();
         var rec = createJoinedRecord('arrays/french', 'arrays/english');
         rec.on('child_moved', spy);
         rec.once('value', function(snap) {
            sinon.assert.callCount(spy, 0);
            helpers
               .chain()
               .setPriority('arrays/french/1', 25)
               .wait(function(){
                  sinon.assert.callCount(spy, 1);
                  expect(spy.args[0][0].name()).to.equal('1');
               })
               .testDone(done);
         });
      });

      it('should call "child_changed" when source is an array', function(done) {
         var spy = sinon.spy();
         var rec = createJoinedRecord('arrays/english', 'arrays/spanish');
         rec.on('child_changed', spy);
         rec.once('value', function(snap) {
            sinon.assert.callCount(spy, 0);
            helpers
               .chain()
               .set('arrays/english/2', 'twotwo')
               .wait(function(){
                  sinon.assert.callCount(spy, 1);
                  var snap = spy.args[0][0];
                  expect(snap.name()).to.equal('2');
                  expect(snap.val()).to.eql({ english: 'twotwo', numero: 'dos' });
               })
               .testDone(done);
         });
      });
   });

   describe('#off', function() {
      it('should remove a specific listener if given an event, function, and scope', function() {
         var ctx = {};
         var ref = createJoinedRecord(
            {ref: helpers.ref('users/account'), keyMap: ['email']},
            {ref: helpers.ref('users/profile'), keyMap: ['name']}
         );
         var list = ['child_added', 'child_added', 'value', 'value', 'child_removed', 'child_removed'];
         var subs = fb.util.map(list, function(event) {
            var out = {
               event: event,
               fn: sinon.stub(),
               ctx: ctx
            };
            ref.on(out.event, out.fn, out.ctx);
            return out;
         });
         expect(ref.getObservers()).to.have.length(6);
         expect(ref.getObservers(subs[1].event)).to.have.length(2);
         ref.off(subs[1].event, subs[1].fn, subs[1].ctx);
         expect(ref.getObservers()).to.have.length(5);
         expect(ref.getObservers(subs[1].event)).to.have.length(1);
         ref.off();
      });

      it('should remove correct listeners if given event and function but no scope', function() {
         function fn1() {}
         function fn2() {}
         var ref = createJoinedRecord(
            {ref: helpers.ref('users/account'), keyMap: ['email']},
            {ref: helpers.ref('users/profile'), keyMap: ['name']}
         );
         var list = ['child_added', 'child_added', 'value', 'value', 'child_removed', 'child_removed'];
         fb.util.each(list, function(event, i) {
            ref.on(event, i++%2? fn2 : fn1);
         });
         expect(ref.getObservers()).to.have.length(6);
         expect(ref.getObservers('child_added')).to.have.length(2);
         ref.off('child_added', fn2);
         expect(ref.getObservers()).to.have.length(5);
         expect(ref.getObservers('child_added')).to.have.length(1);
         ref.off();
      });

      it('should remove all listeners if given only an event', function() {
         function Obj() {}
         var ref = createJoinedRecord(
            {ref: helpers.ref('users/account'), keyMap: ['email']},
            {ref: helpers.ref('users/profile'), keyMap: ['name']}
         );
         var list = ['child_added', 'child_added', 'value', 'value', 'child_removed', 'child_removed'];
         var subs = fb.util.map(list, function(event) {
            var out = {
               event: event,
               fn: sinon.stub(),
               ctx: new Obj()
            };
            ref.on(out.event, out.fn, out.ctx);
            return out;
         });
         expect(ref.getObservers()).to.have.length(6);
         expect(ref.getObservers(subs[0].event)).to.have.length(2);
         ref.off(subs[0].event);
         expect(ref.getObservers()).to.have.length(4);
         expect(ref.getObservers(subs[0].event)).to.have.length(0);
         ref.off();
      });

      it('should should remove all listeners if no arguments', function() {
         var ref = createJoinedRecord(
            {ref: helpers.ref('users/account'), keyMap: ['email']},
            {ref: helpers.ref('users/profile'), keyMap: ['name']}
         );
         var list = ['child_added', 'child_added', 'value', 'value', 'child_removed', 'child_removed'];
         fb.util.each(list, function(event) {
            ref.on(event, function() {}, {});
         });
         expect(ref.getObservers()).to.have.length(6);
         ref.off();
         expect(ref.getObservers()).to.have.length(0);
      });
  });

   describe('#once', function() {
      it('should return the callback function', function() {
         var fn = sinon.stub();
         var rec = createJoinedRecord('users/account', 'users/profile');
         var res = rec.once('value', fn);
         expect(res).to.equal(fn);
         rec.off();
      });

      it('should pass callback a JoinedSnapshot', function(done) {
         createJoinedRecord('users/account', 'users/profile').once('value', function(snap) {
            expect(snap).to.be.instanceof(fb.join.JoinedSnapshot);
            done();
         });
      });

      it('should work if called when value is already cached', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         rec.once('value', function(snap1) {
            // make sure the value downloads before we call again
            helpers.ref('users/account').once('value', function() {
               rec.once('value', function(snap2) {
                  expect(snap2.val()).to.eql(snap1.val());
                  done();
               })
            });
         });
      });

      it('should get called exactly one time', function(done){
         var spy = sinon.spy(), adds = 0;
         createJoinedRecord('users/account', 'users/profile')
            .once('value', spy);

         helpers.chain()
            .set('users/account/john', {email: 'john@john.com'})
            .set('users/account/mandy', {email: 'mandy@mandy.com'})
            .set('users/account/mary', {email: 'mary@mary.com'})
            .pause(function() {
               expect(spy).calledOnce;
            })
            .testDone(done);
      });

      it('should return a JoinedRecord at the right child path if called on a child', function(done) {
         createJoinedRecord('users/account', 'users/profile')
            .child('kato/name')
            .once('value', function(snap) {
               expect(snap.ref()).to.be.instanceOf(JoinedRecord);
               expect(snap.name()).to.equal('name');
               expect(snap.ref().parent().parent().name()).to.equal('[account][profile]');
               expect(snap.val()).to.equal('Michael Wulf');
               done();
            });
      });

      it('should work for "value"', function(done) {
         var spy = sinon.spy();
         createJoinedRecord('users/account', 'users/profile').once('value', spy);
         helpers.chain()
            .get('users')
            .wait(function() {
               expect(spy).calledOnce;
               expect(spy.args[0][0].val()).to.eql({
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
            })
            .testDone(done);
      });

      it('should work for "child_added"', function(done) {
         var spy = sinon.spy();
         createJoinedRecord('users/account', 'users/profile').once('child_added', spy);
         helpers
            .chain()
            .get('users')
            .pause(function() {
               expect(spy).calledOnce;
               expect(spy.args[0][0].name()).to.equal('bruce');
            })
            .testDone(done);
      });

      it('should work for "child_removed"', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         var spy = sinon.spy();
         rec.once('child_removed', spy);
         rec.once('value', function() {
            helpers.chain()
               .remove('users/account/bruce')
               .remove('users/profile/bruce')
               .pause(function() {
                  expect(spy).calledOnce;
                  expect(spy.args[0][0].name()).to.equal('bruce');
               })
               .testDone(done);
         });
      });

      it('should work for "child_changed"', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile');
         var spy = sinon.spy();
         rec.once('child_changed', spy);
         rec.once('value', function() {
            helpers
               .chain()
               .set('users/account/bruce/email', 'brucie@wushu.com')
               .pause(function() {
                  expect(spy).calledOnce;
                  expect(spy.args[0][0].name()).to.equal('bruce');
               })
               .testDone(done);
         });
      });

      it('should work for "child_moved"', function(done) {
         var spy = sinon.spy();
         var rec = createJoinedRecord('ordered/set1', 'ordered/set2');
         rec.once('child_moved', spy);
         rec.once('value', function() {
            helpers.chain()
               .setPriority('ordered/set1/two', 900)
               .setPriority('ordered/set1/five', 2)
               .pause(function() {
                  expect(spy).calledOnce;
                  expect(spy.args[0][0].name()).to.equal('two');
                  expect(spy.args[0][1]).to.equal('five');
               })
               .testDone(done);
         });
      });

      it('should return correct value if a dynamic key is put into the keyMap', function(done) {
         var spy = sinon.spy();
         var keyMap = { name: 'name', style: helpers.ref('users/styles') };
         var rec = createJoinedRecord('users/account', {ref: helpers.ref('users/profile'), keyMap: keyMap});
         rec.once('value', spy);
         helpers
            .chain()
            .pause()
            .get('users') // wait for data
            .pause(function() {
               expect(spy).calledOnce;
               var val = spy.args[0][0] && spy.args[0][0].val();
               expect(val).keys(['bruce', 'kato']);
               expect(val.kato).to.eql({
                  email: 'wulf@firebase.com',
                  name: 'Michael Wulf',
                  style: {
                     ".id": "Kung Fu",
                     "description": "Chinese system based on physical exercises involving animal mimicry"
                  }
               });
            })
            .testDone(done);
      });
   });

   describe('#child', function() {
      it('should return a JoinedRecord', function() {
         var rec = fakeMappedRecord('a', 'b').child('c');
         expect(rec).instanceOf(JoinedRecord);
      });

      it('should give the correct name', function() {
         var rec = fakeMappedRecord('a', 'b').child('c');
         expect(rec.name()).to.equal('c');
      });

      it('should work with multiple .child().child() calls when loading keyMap', function(done) {
         var rec = createJoinedRecord('users/account', 'users/profile').child('kato').child('nick').child('abc');
         expect(rec).instanceOf(JoinedRecord);
         expect(rec.name()).to.equal('abc');
         setTimeout(done, 1000);
      });

      it('should work with / in the path and get the correct child', function() {
         var rec = fakeMappedRecord('a', 'b').child('c/x/y/z');
         expect(rec.name()).to.equal('z');
         expect(rec.parent().parent().name()).to.equal('x');
      });

      it('should always return JoinedRecord no matter how many child calls', function() {
         var rec = fakeMappedRecord('a', 'b').child('c/x/y/z');
         expect(rec).instanceOf(JoinedRecord);
      });

      it('should return a ref to the correct path if an alias is used', function(done) {
         var rec = createJoinedRecord({ref: helpers.ref('users/account'), keyMap: {email: 'liame'}}, 'users/profile').child('kato/liame');
         rec.queue.done(function() {
            expect(rec.name()).to.equal('liame');
            expect(rec.paths[0].toString()).to.match(/kato\/email$/);
            done();
         });
      });

      it('should return a ref to correct dynamic keyMap paths', function(done) {
         var rec = createJoinedRecord('users/account', {ref: helpers.ref('users/profile'), keyMap: {
            name: true, nick: true, style: helpers.ref('users/style')
         }}).child('kato/style');

         rec.queue.done(function() {
            expect(rec.name()).to.equal('style');
            expect(rec.paths[0].toString()).to.match(/users\/style\/Kung%20Fu$/);
            done();
         })
      });
  });

   describe('#parent', function() {
      it('should throw an error on the joined parent', function() {
         expect(function() {
            fakeMappedRecord('alpha/one', 'bravo/two').parent();
         }).throws(fb.NotSupportedError);
      });

      it('should return joined master for joined child', function() {
         var master = fakeMappedRecord('alpha/one', 'bravo/two');
         var rec = master.child('wha');
         expect(rec.parent()).to.equal(master);
      });

      it('should return joined child for any field of joined child', function() {
         var rec = createJoinedRecord('users/account', 'users/profile').child('abc');
         expect(rec.child('x/y/z').parent().parent().parent()).to.equal(rec);
      });
  });

   describe('#name', function() {
      it('should be a string', function() {
         var s = fakeMappedRecord('alpha/one', 'bravo/two').name();
         expect(s).to.be.a('string');
         expect(s).to.equal('[one][two]')
      });

      it('should include all paths in the joined record', function() {
         expect(fakeMappedRecord('a', 'c', 'b', 2, 'd').name()).to.equal('[a][c][b][2][d]');
      });

      it('should be just the record id for a joined child record', function() {
         expect(fakeMappedRecord('a', 'c', 'b', 2, 'd').child(25).name()).to.equal('25');
      });

      it('should be just the field name for a deep child of a record', function() {
         expect(fakeMappedRecord('a', 'c', 'b', 2, 'd').child(25).child('a/b/c').name()).to.equal('c');
      });
  });

   describe('#set', function() {
      it('should invoke callback when done', function(done) {
         var newData = { mary: { name: 'had', email: 'a@a.com', nick: 'little lamb' } };
         var rec = createJoinedRecord('users/account', 'users/profile');
         rec.once('value', function(snap) {
            rec.set(newData, function(err) {
               expect(err).to.be.null;
               done();
            });
         });
      });

      it('should invoke callback with error on failure', function(done) {
         console.log("\n\n<<< INTENTIONAL WARNINGS >>>\n");
         helpers
            .chain()
            .set('secured_write_allowed', false)
            .def(function(def) {
               var newData = { mary: { name: 'had', email: 'a@a.com', nick: 'little lamb' } };
               var rec = createJoinedRecord(
                  {ref: helpers.ref('secured/bar'), keyMap: ['.value']},
                  {ref: helpers.ref('secured/foo'), keyMap: ['.value']}
               );
               rec.set(newData, function(err) {
                  expect(err).instanceOf(Error);
                  expect(err).to.match(/PERMISSION_DENIED/);
                  def.resolve();
               });
            })
            .then(function() {
               console.log("\n<<< ///INTENTIONAL WARNINGS >>>\n\n");
            })
            .testDone(done);
      });

      it('should split data to correct paths', function(done) {
         var newData = { mary: { name: 'had', email: 'a@a.com', nick: 'little lamb' } };
         var rec = createJoinedRecord('users/account', 'users/profile');
         rec.once('value', function() {
            rec.set(newData, function(err) {
               expect(err).to.be.null;
               helpers.get('users').done(function(data) {
                  expect(data.account).to.eql({ mary: { email: 'a@a.com' } });
                  expect(data.profile).to.eql({ mary: { name: 'had', nick: 'little lamb' } });
                  done();
               })
            });
         });
      });

      it('should split data to correct paths if called on a child', function(done) {
         var newData = { name: 'Kato 2', email: 'wulf2@firebase.com', 'style': 'Jeet Kune Do', nick: 'Kato??' };
         var rec = createJoinedRecord('users/account', 'users/profile').child('kato');
         rec.once('value', function() {
            rec.set(newData, function(err) {
               expect(err).to.be.null;
               helpers.get('users').done(function(data) {
                  expect(data).to.contain.keys(['account', 'profile']);
                  expect(data.account).to.contain.key('kato');
                  expect(data.profile).to.contain.key('kato');
                  var a = data.account.kato;
                  var b = data.profile.kato;
                  expect(a.email).to.equal('wulf2@firebase.com');
                  expect(a.name).to.be.undefined; // removed by set op since not in keymap
                  expect(b.name).to.equal('Kato 2');
                  expect(b.nick).to.equal('Kato??');
                  expect(b.style).to.equal('Jeet Kune Do');
                  done();
               });
            })
         })
      });

      it('should set primitives properly', function(done) {
         var newData = { 'set1': 222, 'set2': 2020 };
         var rec = createJoinedRecord('ordered/set1', 'ordered/set2');
         rec.once('value', function() {
            rec.child('two').set(newData, function(err) {
               expect(err).to.be.null;
               helpers.get('ordered').done(function(data) {
                  expect(data.set1.two).to.equal(newData.set1);
                  expect(data.set2.two).to.equal(newData.set2);
                  done();
               })
            });
         });
      });

      it('should work if called with a null', function(done) {
         var rec = createJoinedRecord('ordered/set1', 'ordered/set2');
         rec.once('value', function() {
            rec.set(null, function(err) {
               expect(err).to.be.null;
               helpers.get('ordered').done(function(data) {
                  expect(data).to.be.null;
                  done();
               })
            });
         });
      });

      it('should work with null on child records', function(done) {
         var rec = createJoinedRecord('ordered/set1', 'ordered/set2');
         rec.once('value', function() {
            rec.child('two').set(null, function(err) {
               expect(err).to.be.null;
               helpers.get('ordered').done(function(data) {
                  expect(data.set1).not.to.contain.keys(['two']);
                  expect(data.set2).not.to.contain.keys(['two']);
                  done();
               })
            });
         });
      });

      it('should work with null on deeply nested child objects', function(done) {
         var rec = createJoinedRecord('users', 'unions');
         rec.child('profile/kato/nick').set(null, function(err) {
            expect(err).to.be.null;
            helpers.get('users/profile/kato').done(function(data) {
               expect(data).to.eql({ name: 'Michael Wulf', style: 'Kung Fu' });
               done();
            })
         });
      });

      it('should work if given a primitive for a record\'s field', function(done) {
         var rec = createJoinedRecord('users', 'unions');
         rec.child('profile/kato/nick').set('ALL YOUR BASE ARE BELONG TO US', function(err) {
            expect(err).to.be.null;
            helpers.get('users/profile/kato/nick').done(function(data) {
               expect(data).to.equal('ALL YOUR BASE ARE BELONG TO US');
               done();
            })
         });
      });

      it('should fail if I set multiple paths to a primitive', function(done) {
         helpers.debugThisTest(false);
         var rec = createJoinedRecord('users/profile', 'users/account');
         rec.set('SOMEONE SET UP US THE BOMB', function(err) {
            expect(err).instanceOf(Error);
            helpers.get('users/profile/kato').done(function(data) {
               expect(data).to.be.an('object');
               done();
            })
         });
      });

      it('should fail to set() a primitive on a joined path, even if it has only one path', function(done) {
         helpers.debugThisTest(false);
         var rec = createJoinedRecord('users/profile').child('kato');
         rec.set('SOMEONE SET UP US THE BOMB', function(err) {
            expect(err).instanceOf(Error);
            helpers.get('users/profile/kato').done(function(data) {
               expect(data).to.be.an('object');
               done();
            })
         });
      });

      it('should create a record which does not exist', function(done) {
         var rec = createJoinedRecord('users/profile', 'users/account').child('mary');
         rec.set({ email: 'mary@mary.com', name: 'mary', 'style': 'Leopard Fu' }, function(err) {
            rec.off();
            expect(err).to.be.null;
            helpers
               .chain()
               .get('users/account/mary')
               .then(function(data) {
                  expect(data).to.eql({ email: 'mary@mary.com', name: 'mary' });
               })
               .get('users/profile/mary')
               .then(function(data) {
                  expect(data).to.eql({ style: 'Leopard Fu' });
               })
               .testDone(done);
         });
      });

      it('should create a field which does not exist', function(done) {
         var katoData = {
            name: 'Kato?',
            email: 'katoooo@firebase2.com',
            nick: 'Sidekick',
            style: 'Kung Fu'
         };
         helpers
            .chain()
            .remove('users/account/kato/email')
            .then(function() {
               return helpers.def(function(def) {
                  var rec = createJoinedRecord('users/account', 'users/profile')
                     .child('kato')
                     .set(katoData, function(err) {
                        if( err ) { def.reject(err); }
                        else { def.resolve(); }
                     });
               });
            })
            .get('users/account/kato')
            .then(function(data) {
               expect(data).not.to.be.empty;
               expect(data.email).to.eql(katoData.email);
            })
            .testDone(done);
      });

      it('should accept array', function(done) {
         var newVals = [
            { numero: 'cerocero', english: 'zerozero' },
            { numero: 'unouno', english: 'oneone' },
            { numero: 'dosdos', english: 'twotwo' }
         ];
         var rec = createJoinedRecord('arrays/english', 'arrays/spanish');
         rec.set(newVals, function(err) {
            expect(err).to.be.null;
            helpers
               .chain()
               .get('arrays/english')
               .then(function(data) {
                  expect(data).to.eql([ 'zerozero', 'oneone', 'twotwo' ]);
               })
               .get('arrays/spanish')
               .then(function(data) {
                  expect(data).to.eql([
                     { numero: 'cerocero' },
                     { numero: 'unouno' },
                     { numero: 'dosdos' }
                  ]);
               })
               .testDone(done);
         });
      });

      it('should accept array on child record', function(done) {
         var rec = createJoinedRecord('arrays/english', 'arrays/spanish');
         rec.child('1').set({ numero: 'dosdos', english: 'twotwo' }, function(err) {
            expect(err).to.be.null;
            helpers
               .chain()
               .get('arrays/english/1')
               .then(function(data) {
                  expect(data).to.equal('twotwo');
               })
               .get('arrays/spanish/1')
               .then(function(data) {
                  expect(data).to.eql({ numero: 'dosdos' });
               })
               .testDone(done);
         });
      });

      it('should delete missing keys on master', function(done) {
         createJoinedRecord('users/account', 'users/profile')
            .set({ 'mary': { 'name': 'Mary', 'email': 'mary@mary.com' } }, function(err) {
               expect(err).to.be.null;
               helpers
                  .chain()
                  .get('users/account')
                  .then(function(data) {
                     expect(data).to.have.keys(['mary']);
                  })
                  .get('users/profile')
                  .then(function(data) {
                     expect(data).to.have.keys(['mary']);
                  })
                  .testDone(done);
            });
      });

      it('should delete missing keys on child', function(done) {
         createJoinedRecord('users/account', 'users/profile')
            .child('kato')
            .set({ 'email': 'kato@kato.com' }, function(err) {
               expect(err).to.be.null;
               helpers
                  .chain()
                  .get('users/account/kato')
                  .then(function(data) {
                     expect(data).to.have.keys(['email']);
                  })
                  .get('users/profile/kato')
                  .then(function(data) {
                     expect(data).to.be.null;
                  })
                  .testDone(done);
            });
      });

      it('should delete primitives', function(done) {
         createJoinedRecord('unions/fruit', 'unions/legume', 'unions/veggie')
            .set({
               a: { fruit: 'aaa', legume: 'aab' },
               b: { legume: 'bbb' },
               c: null
            }, function(err) {
               expect(err).to.be.null;
               helpers
                  .chain()
                  .get('unions')
                  .then(function(data) {
                     expect(data).to.eql({
                        fruit: {a: 'aaa'},
                        legume: { a: 'aab', b: 'bbb' }
                     });
                  })
                  .testDone(done);
            })
      });

      it('should delete primitives on child', function(done) {
         createJoinedRecord('unions/fruit', 'unions/legume', 'unions/veggie')
            .child('b')
            .set({ fruit: 'aaa', legume: 'aab' }, function(err) {
               expect(err).to.be.null;
               helpers
                  .chain()
                  .get('unions/fruit/b')
                  .then(function(data) {
                     expect(data).to.equal('aaa');
                  })
                  .get('unions/legume/b')
                  .then(function(data) {
                     expect(data).to.equal('aab');
                  })
                  .get('unions/veggie/b')
                  .then(function(data) {
                     expect(data).to.be.null;
                  })
                  .testDone(done);
            })
      });

      it.skip('should set dynamic keyMap data from master', function(done) {
         createJoinedRecord('users/account', {
            ref: helpers.ref('users/profile'), keyMap: {
               name: 'name',
               nick: 'nick',
               style: helpers.ref('users/style')
            }
         }).set({ mary: {
               email: 'mary@mary.com',

            } }, function(err) {
               expect(err).to.be.null;
               helpers
                  .chain()
                  .get('unions/fruit/b')
                  .then(function(data) {
                     expect(data).to.equal('aaa');
                  })
                  .get('unions/legume/b')
                  .then(function(data) {
                     expect(data).to.equal('aab');
                  })
                  .get('unions/veggie/b')
                  .then(function(data) {
                     expect(data).to.be.null;
                  })
                  .testDone(done);
            })
      });

      it('should set dynamic keyMap data if called on child');

      it('should set dynamic keyMap key from master');

      it('should set dynamic keyMap key from child');

      it('should delete dynamic keyMap paths');

      it('should delete dynamic keyMap paths on child');

      it('should set primitive at dynamic keyMap path');

      it('should ??? for an empty path and no keyMap');

      it('should ??? if all paths are empty and no keyMap');

      it('should set properly if given a single .value keyMap which points to a dynamic path');
   });

   describe('#setWithPriority', function() {
      it('should invoke callback when done');

      it('should invoke callback with error on failure');

      it('should set the priority on the sortPath');

      it('should trigger child_moved if priority changes');

      it('should not trigger child_moved if priority does not change');

      it('should trigger value if data changes');

      it('should not trigger vaule if data does not change');

      it('should work with primitive');

      it('should work with null');

      it('should work on child record\'s fields');

      it('should work on child records with primitives');
   });

   describe('#setPriority', function() {
      it('should invoke callback when done');

      it('should invoke callback with error on failure');

      it('should set priority on first path if no sortBy');

      it('should set priority on sortBy path if provided');

      it('should accept null');

      it('should accept number');

      it('should accept string');
   });

   describe('#update', function() {
      it('should invoke callback when done');

      it('should invoke callback with error on failure');

      it('should only modify fields specified (ignores extra fields in data passed to set)');

      it('should preserve fields not in the keyMap (they are not overwritten or set to null)');

      it('should set data on dynamic keyMap paths');

      it('should update multiple records if called on joined parent');

      it('should update multiple fields if called on joined child');

      it('should accept null values');

      it('should accept primitives');

      it('should call set on children if update invoked on master');
   });

   describe('#remove', function() {
      it('should invoke callback when done');

      it('should invoke callback with error on failure');

      it('should remove all records from all paths if called on joined parent');

      it('should remove record from all joined paths');

      it('should not blow up if record does not exist');

      it('should trigger "child_moved" on next record'); //todo??????

      it('should remove dynamic keyMap paths');

      it('should delete entire record (including fields not in keyMap)');

      it('should work on nested paths');

      it('should work on record fields');
  });

   describe('#push', function() {
      it('should invoke callback when done');

      it('should invoke callback with error on failure');

      it('should create new joined records');

      it('should create new children in child records');

      it('should create new dynamic path records if they have data');

      it('should work on deep paths');

      it('should work without setting data');
  });

   describe('#root', function() {
      it('should return the root ref', function(done) {
         helpers
            .chain()
            .sup()
            .then(function() {
               var root = createJoinedRecord('users/account').root();
               expect(root.name()).to.be.null;
               expect(root.parent()).to.be.null;
               expect(root.toString()).to.equal(helpers.ref(null).toString());
            })
            .testDone(done);
      });

      it('should work from any depth of child records', function(done) {
         helpers
            .chain()
            .sup()
            .then(function() {
               var root = createJoinedRecord('users/account').child('x/y/z').child('omega').root();
               expect(root.name()).to.be.null;
               expect(root.parent()).to.be.null;
               expect(root.toString()).to.equal(helpers.ref(null).toString());
            })
            .testDone(done);
      });
  });

   describe('#toString', function() {
      it('should return a URL', function() {
         expect(createJoinedRecord('users/account', 'users/profile').toString()).to.equal([
            '[',
            helpers.ref('users/account').toString(),
            '][',
            helpers.ref('users/profile').toString(),
            ']'].join(''));
      });
  });

   describe('#ref', function() {
      it('should return self', function() {
         var rec = createJoinedRecord('users/account', 'users/profile');
         expect(rec.ref()).to.equal(rec);
      });

      it('should return self for a deep child ref', function() {
         var rec = createJoinedRecord('users/account', 'users/profile').child('x/y/z');
         expect(rec.ref()).to.equal(rec);
      });
  });

   describe('#onDisconnect', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            createJoinedRecord('unions/fruit', 'unions/legume').onDisconnect();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#limit', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            createJoinedRecord('unions/fruit', 'unions/legume').limit();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#endAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            createJoinedRecord('unions/fruit', 'unions/legume').endAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#startAt', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            createJoinedRecord('unions/fruit', 'unions/legume').startAt();
         }).to.throw(fb.NotSupportedError);
      });
  });

   describe('#transaction', function() {
      it('should throw a NotSupportedError', function() {
         expect(function() {
            createJoinedRecord('unions/fruit', 'unions/legume').transaction();
         }).to.throw(fb.NotSupportedError);
      });
  });

  /** UTILS
    ***************************************************/

   /**
    * create a joined record and add an off() call after each test
    * so listeners don't interfere with each other if a test fails
    */
   function createJoinedRecord(a, b, c) {
      var args = fb.util.map(arguments, function(x) {
         return fb.util.isObject(x)? x : helpers.ref(x);
      });
      var rec = construct(JoinedRecord, args);
      helpers.turnOffAfterTest(rec);
      return rec;
   }

   function fakeMappedRecord(a, b, c) {
      var list = 'abcdefhijklmnopqrstuvwxyz';
      var args = fb.util.map(arguments, function(path,i) {
         if( fb.util.isObject(path) ) {
            path.keyMap = [list[i]];
         }
         else {
            path = {
               ref: helpers.ref(path),
               keyMap: [list[i]]
            }
         }
         return path;
      })
      return createJoinedRecord.apply(null, args);
   }

   /**
    * Create a record with intersects: true for any string values
    * @param {Array} intersects
    * @param {Array} [unions]
    * @returns {*}
    */
   function newIntersection(intersects, unions) {
      intersects = fb.util.map(intersects, function(x) {
         if( typeof(x) === 'string' ) {
            return {
               intersects: true,
               ref: helpers.ref(x)
            };
         }
         else {
            x.intersects = true;
            return x;
         }
      });
      return createJoinedRecord.apply(null, [].concat(intersects, unions||[]));
   }

   // credits: http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
   function construct(constructor, args) {
      function F() {
         return constructor.apply(this, args);
      }
      F.prototype = constructor.prototype;
      return new F();
   }

});