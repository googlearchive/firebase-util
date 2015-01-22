
QUnit.config.testTimeout = 5000;

var setup = {
  beforeEach: function(assert) {
    this.fbRef = new Firebase(URL).push();
    this.fbRef.onDisconnect().remove();
    this.fbRef.set(DEFAULT_DATA, assert.async());
  },

  afterEach: function(assert) {
    this.fbRef.remove(assert.async());
  }
};

QUnit.module("RecordSet", setup);

QUnit.test('value event returns fully merged results', function(assert) {
  Firebase.util.logLevel('debug');
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

QUnit.skip('child_added triggers for correct keys');

QUnit.module('Record', setup);

QUnit.test('value event returns fully merged results', function(assert) {
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', 'nicknames.$value').ref().child('bruce');
  ref.once('value', function(snap) {
    assert.deepEqual(snap.val(), {name: "Bruce Lee", style: "Jeet Kune Do", $value: "Little Phoenix"});
    done();
  });
});

QUnit.skip('child_added triggers for correct keys');

QUnit.module('RecordField', setup);

QUnit.test('ref is for the correct path/url', function(assert) {
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce/nick');
  assert.equal(ref.toString(), fb.child('users/nicknames/nick').toString());
});

QUnit.test('value event returns fully merged results', function(assert) {
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('users'), this.fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {ref: 'nicknames.$value', alias: 'nick'}).ref().child('bruce/nick');
  ref.once('value', function(snap) {
    assert.deepEqual(snap.val(), "Little Phoenix");
    done();
  });
});

QUnit.skip('child_added triggers for correct keys');

var URL = 'https://fbutil.firebaseio.com/test';
var DEFAULT_DATA = {
  "feeds": {
    "The Dojo": {
      "members": {
        "bruce": true,
        "chuck": true
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
    "The Dojo": {
      "message1": {
        "user": "bruce",
        "text": "There is no mystery about my style. My movements are simple, direct and non-classical. The extraordinary part of it lies in its simplicity."
      },
      "message2": {
        "user": "chuck",
        "text": "Men are like steel. When they lose their temper, they lose their worth."
      }
    }
  }
};
