
var sinonChai = require('sinon-chai');
var expect = require('chai').use(sinonChai).expect;
var fbUtils = require('../dist/firebase-util.js');
var Firebase = require('firebase');
var helpers = require('./util/test-helpers.js');
var data = require('./util/data.join.json');

describe('Firebase.util.join public methods', function() {
   beforeEach(function(done) {
      helpers.reset(data, done);
   });

   describe('#join', function() {
      it('should return a JoinedRecord', function() {
         var res = fbUtils.join(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept hash objects', function() {
         var res = fbUtils.join({ref: new Firebase('https://fbutil.firebaseio.com/users/account')});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a JoinedRecord', function() {
         var rec = new fbUtils.JoinedRecord(new Firebase('https://fbutil.firebaseio.com/users/account'));
         var res = fbUtils.join({ref: rec});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a Firebase', function() {
         var res = fbUtils.join(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should allow intersects: true', function() {
         var res = fbUtils.join(
            new Firebase('https://fbutil.firebaseio.com/users/account'),
            {intersects: true, ref: new Firebase('https://fbutil.firebaseio.com/users/profile')}
         );
         expect(res.paths[0].isIntersection()).to.be.false;
         expect(res.paths[1].isIntersection()).to.be.true;
      });
   });

   describe('#intersection', function() {
      it('should return a JoinedRecord', function() {
         var res = fbUtils.intersection(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept hash objects', function() {
         var res = fbUtils.intersection({ref: new Firebase('https://fbutil.firebaseio.com/users/account')});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a JoinedRecord', function() {
         var rec = new fbUtils.JoinedRecord(new Firebase('https://fbutil.firebaseio.com/users/account'));
         var res = fbUtils.intersection({ref: rec});
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should accept a Firebase', function() {
         var res = fbUtils.intersection(new Firebase('https://fbutil.firebaseio.com/users/account'));
         expect(res).to.be.instanceOf(fbUtils.JoinedRecord);
      });

      it('should allow intersects: false', function() {
         var res = fbUtils.intersection(
            new Firebase('https://fbutil.firebaseio.com/users/account'),
            {intersects: false, ref: new Firebase('https://fbutil.firebaseio.com/users/profile')}
         );
         expect(res.paths[0].isIntersection()).to.be.true;
         expect(res.paths[1].isIntersection()).to.be.false;
      });

      it('should be null if a path contains no records', function(done) {
         fbUtils.intersection(
            new Firebase('https://fbutil.firebaseio.com/foo/bar'),
            new Firebase('https://fbutil.firebaseio.com/ordered/set2')
         ).once('value', function(snap) {
               expect(snap.val()).to.be.null;
               done();
         });
      })
   });

   describe('join() with limit/startAt/endAt', function() {
      it('should return subset when using limit/startAt', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/arrays');
         fbUtils.join(
            fb.child('english').limit(1).startAt(null, '2'),
            fb.child('spanish'),
            fb.child('french')
         ).once('value', function(snap) {
            expect(snap.val()).to.have.keys(['0', '1', '2', '3', '4', '5']);
            snap.forEach(function(ss) {
               var keys = ['numero', 'french'];
               if( ss.name() === '2' ) { keys.push('english'); }
               expect(ss.val()).to.have.keys(keys);
            });
            done();
         });
      });

      it('should allow set() ops', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/arrays');
         var ref = fbUtils.join(
            fb.child('english').limit(1).startAt(null, '2'),
            fb.child('spanish').limit(1).startAt(null, '2'),
            fb.child('french').limit(1).startAt(null, '2')
         );
         ref.set([
            { english: 'notta', numero: 'nope', french: 'nunca' },
            { english: 'solo', numero: 'solamente', french: 'seulement' },
            { english: 'pair', numero: 'par', french: 'paire' }
         ], function(err) {
            expect(err).to.be.null;
            ref.once('value', function(snap) {
               expect(snap.val()).to.eql({
                  '2': { english: 'pair', numero: 'par', french: 'paire' }
               });
               fb.child('english/1').once('value', function(ss) {
                  expect(ss.val()).to.equal('solo');
                  done();
               })
            });
         });
      });

      it('should allow remove() ops', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/ordered');
         var ref = fbUtils.join(
            fb.child('set1').limit(1).startAt(null, 'two'),
            fb.child('set2').limit(1).startAt(null, 'two')
         );
         ref.remove(function(err) {
            expect(err).to.be.null;
            fb.once('value', function(snap) {
               expect(snap.val()).to.be.null;
               done();
            })
         })
      });

      it('should allow update() ops', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/unions');
         var ref = fbUtils.join(
            fb.child('fruit').limit(1).startAt(null, 'b'),
            fb.child('legume').limit(1).startAt(null, 'b'),
            fb.child('veggie').limit(1).startAt(null, 'b')
         );
         ref.update({'b': { fruit: 'bangarang', legume: 'beans beans beans', veggie: 'broccolaaay' }}, function(err) {
            expect(err).to.be.null;
            fb.once('value', function(snap) {
               var data = snap.val();
               expect(data['fruit']['b']).to.equal('bangarang');
               expect(data['legume']['b']).to.equal('beans beans beans');
               expect(data['veggie']['b']).to.equal('broccolaaay');
               done();
            });
         })
      });
   });

   describe('intersection() with limit/startAt/endAt', function() {
      it('should only include records within the query set', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/ordered');
         fbUtils.intersection(
            fb.child('set1').limit(2).startAt(2),
            fb.child('set2')
         ).once('value', function(snap) {
            expect(snap.val()).to.eql({
               two: { set1: 2, set2: 22 },
               three: { set1: 3, set2: 33 }
            });
            done();
         });
      });

      it('should be null if one path contains no values', function(done) {
         var fb = new Firebase('https://fbutil.firebaseio.com/ordered');
         fbUtils.intersection(
               fb.child('set1').limit(2).startAt('not a valid priority'),
               fb.child('set2')
            ).once('value', function(snap) {
               expect(snap.val()).to.be.null;
               done();
            });
      });

      it('should not return more records than limit', function(done) {
        var fb = new Firebase('https://fbutil.firebaseio.com/unions');
        fbUtils.intersection(
          fb.child('legume').limit(2), fb.child('veggie')
        ).once('value', function(snap) {
           expect(snap.val()).to.eql({
             b: { legume: 'baked beans', veggie: 'broccoli' },
             d: { legume: 'dry-roasted peanuts', veggie: 'daikon raddish' }
           });
           done();
        });
      });
   });

});
