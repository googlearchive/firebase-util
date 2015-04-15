
var URL = 'https://fbutil.firebaseio.com/test';
var SEED_DATA_FOR_TEST = {
  "feeds": {
    "TheDojo": {
      "members": {
        "bruce": true,
        "chuck": true,
        "kato": true
      }
    }
  },

  "users": {
    "bruce": {
      "name": "Bruce Lee",
      "style": "Jeet Kune Do"
    },
    "chuck": {
      "name": "Carlos Ray Norris",
      "style": "Chuck Kuk Do"
    }
  },

  "nicknames": {
    "bruce": "Little Phoenix",
    "chuck": "Chuck"
  },

  "styles": {
    "Jeet Kune Do": "An eclectic, hybrid fighting style emphasizing minimal movements for maximum effect.",
    "Chuck Kuk Do": "A Korean-based, American hybrid style, combining elements from several different fighting styles."
  },

  "messages": {
    "TheDojo": {
      "message1": {
        "user": "bruce",
        "text": "There is no mystery about my style. My movements are simple, direct and non-classical. The extraordinary part of it lies in its simplicity."
      },
      "message2": {
        "user": "chuck",
        "text": "Men are like steel. When they lose their temper, they lose their worth."
      }
    }
  },

  "more_messages": {
    "TheDojo": {
      "message1": {
        "more": "More is better"
      },
      "message2": {
        "more": "Less is not better"
      }
    }
  }
};

QUnit.config.testTimeout = 5000;

var setup = {
  beforeEach: function(assert) {
    this.fbRef = new Firebase(URL).push();
    this.fbRef.onDisconnect().remove();
    this.fbRef.set(SEED_DATA_FOR_TEST, assert.async());
  },

  afterEach: function(assert) {
    this.fbRef.remove(assert.async());
    Firebase.util.logLevel();
  }
};

QUnit.module("RecordSet", setup);

QUnit.test('ref is for the correct path/url', function(assert) {
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  assert.equal(ref.toString(),
    '[' + this.fbRef.child('users').toString() + '][' + this.fbRef.child('nicknames').toString() + ']');
  assert.equal(ref.key(), '[users][nicknames]');
});

QUnit.test('value event returns fully merged results', function(assert) {
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  ref.once('value', function(snap) {
    assert.deepEqual(snap.val(), {
      chuck: {
        "nick": "Chuck",
        "name": "Carlos Ray Norris",
        "style": "Chuck Kuk Do"
      },
      bruce: {
        "nick": "Little Phoenix",
        "name": "Bruce Lee",
        "style": "Jeet Kune Do"
      }
    });
    done();
  });
});

QUnit.test('child_added triggers for correct keys', function(assert) {
  assert.expect(4);
  var done = assert.async();
  var keys = ['bruce', 'chuck'];
  var vals = {
    bruce: { name: 'Bruce Lee', style: 'Jeet Kune Do', nick: 'Little Phoenix' },
    chuck: { name: 'Carlos Ray Norris', style: 'Chuck Kuk Do', nick: 'Chuck' }
  };
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  ref.on('child_added', function(snap) {
    var key = keys.shift();
    assert.equal(snap.key(), key);
    assert.deepEqual(snap.val(), vals[key]);
  }, done);
  ref.once('value', done, done);
});

QUnit.test('set() writes correct data to each path', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  ref.set({kato: {nick: 'Kato', name: 'katokato', style: 'MMA'}, bruce: null}, function(err) {
    assert.equal(err, null);
    fbRef.child('nicknames').once('value', function(nickSnap) {
      fbRef.child('users').once('value', function(userSnap) {
        assert.deepEqual(nickSnap.val(), {chuck: 'Chuck', kato: 'Kato'});
        assert.deepEqual(userSnap.val(), {chuck: {
          name: 'Carlos Ray Norris', style: 'Chuck Kuk Do'
        }, kato: {
          name: 'katokato', style: 'MMA'}
        });
        done();
      }, done);
    }, done);
  });
});

QUnit.test('update() writes correct data to each path', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  ref.update({bruce: {nick: 'Brucie', style: 'MMA'}}, function(err) {
    assert.equal(err, null);
    fbRef.child('nicknames').once('value', function(nickSnap) {
      fbRef.child('users').once('value', function(userSnap) {
        assert.deepEqual(nickSnap.val(), {chuck: 'Chuck', bruce: 'Brucie'});
        assert.deepEqual(userSnap.val(), {
          chuck: {
            name: 'Carlos Ray Norris', style: 'Chuck Kuk Do'
          },
          bruce: {
            name: 'Bruce Lee', style: 'MMA'
          }
        });
        done();
      }, done);
    }, done);
  });
});

QUnit.module('Record', setup);

QUnit.test('ref is for the correct path/url', function(assert) {
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce');
  assert.equal(ref.toString(),
    '[' + this.fbRef.child('users').child('bruce').toString() + '][' +
        this.fbRef.child('nicknames').child('bruce').toString() + ']');
  assert.equal(ref.key(), 'bruce');
});

QUnit.test('value event returns fully merged results', function(assert) {
  assert.expect(1);
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', 'nicknames.$value').ref().child('bruce');
  ref.once('value', function(snap) {
    assert.deepEqual(snap.val(), {name: "Bruce Lee", style: "Jeet Kune Do", $value: "Little Phoenix"});
    done();
  });
});

QUnit.test('child_added triggers for correct keys', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(
    [this.fbRef.child('messages/TheDojo'), 'm'],
    [this.fbRef.child('more_messages/TheDojo'), 'x'],
    [this.fbRef.child('users'), 'u', 'm.user']
  );
  var ref = nc.select('m.text', 'm.user', 'x.more', 'u.name').ref().child('message1');
  // we do not get a child_added for "name" because it is a dynamic dependency
  var keys = ['text', 'user', 'more'];
  ref.on('child_added', function(snap) {
    assert.equal(snap.key(), keys.shift());
  }, done);
  ref.once('value', done, done);
});

QUnit.test('set() writes correct data to each path', function(assert) {
  assert.expect(4);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce');
  ref.set({nick: 'Brucie', name: 'brucebruce'}, function(err) {
    assert.equal(err, null);
    fbRef.child('nicknames/bruce').once('value', function(nickSnap) {
      fbRef.child('users/bruce').once('value', function(userSnap) {
        assert.equal(nickSnap.val(), 'Brucie');
        assert.equal(userSnap.child('name').val(), 'brucebruce');
        assert.equal(userSnap.child('style').val(), null);
        done();
      }, done);
    }, done);
  });
});

QUnit.test('update() writes correct data to each path', function(assert) {
  assert.expect(4);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce');
  ref.update({nick: 'Brucie', name: 'brucebruce'}, function(err) {
    assert.equal(err, null);
    fbRef.child('nicknames/bruce').once('value', function(nickSnap) {
      fbRef.child('users/bruce').once('value', function(userSnap) {
        assert.equal(nickSnap.val(), 'Brucie');
        assert.equal(userSnap.child('name').val(), 'brucebruce');
        assert.equal(userSnap.child('style').val(), 'Jeet Kune Do');
        done();
      }, done);
    }, done);
  });
});

QUnit.module('RecordField', setup);

QUnit.test('ref is for the correct path/url', function(assert) {
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce/nick');
  assert.equal(ref.toString(), this.fbRef.child('nicknames/bruce').toString());
});

QUnit.test('value event returns value for correct child path', function(assert) {
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce/nick');
  var fbRef = this.fbRef;
  ref.once('value', function(snap) {
    assert.equal(snap.ref().toString(), fbRef.child('/nicknames/bruce').toString());
    assert.deepEqual(snap.val(), "Little Phoenix");
    done();
  });
});

QUnit.test('child_added triggers for correct keys', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('feeds'));
  var ref = nc.select('feeds.members').ref().child('TheDojo/members');
  var keys = ['bruce', 'chuck', 'kato'];
  ref.on('child_added', function(snap) {
    assert.equal(snap.key(), keys.shift());
  });
  ref.once('value', done, done);
});

QUnit.test('set() writes correct data to each path', function(assert) {
  assert.expect(2);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('feeds'));
  var ref = nc.select('feeds.members').ref().child('TheDojo/members');
  ref.set({foo: 'bar'}, function(err) {
    assert.equal(err, null);
    fbRef.child('feeds/TheDojo/members').once('value', function(snap) {
      assert.deepEqual(snap.val(), {foo: 'bar'});
      done();
    }, done);
  });
});

QUnit.test('update() writes correct data to each path', function(assert) {
  assert.expect(2);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('feeds'));
  var ref = nc.select('feeds.members').ref().child('TheDojo').child('members');
  ref.update({foo: 'bar', chuck: false, kato: null}, function(err) {
    assert.equal(err, null);
    fbRef.child('feeds/TheDojo/members').once('value', function(snap) {
      assert.deepEqual(snap.val(), {bruce: true, chuck: false, foo: 'bar'});
      done();
    }, done);
  });
});

