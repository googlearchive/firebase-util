var URL = 'https://fbutil.firebaseio.com/test';
var fb;

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

QUnit.module("RecordSet", {
  beforeEach: function(assert) {
    this.firebaseRef = new Firebase(URL).push();
    this.firebaseRef.onDisconnect().remove();
    this.firebaseRef.set(DEFAULT_DATA, assert.async());
  },

  afterEach: function(assert) {
    this.firebaseRef.remove(assert.async());
  }
});

QUnit.test('value event returns fully merged results for RecordSet', function(assert) {
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.firebaseRef.child('users'), this.firebaseRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', 'nicknames.$value').ref();
  ref.once('value', function(snap) {
    console.log('got value', snap.val());
    assert.deepEquals(snap.val(), {foo: 'bar'});
    done();
  });
});

QUnit.skip('value event returns fully merged results for Record');

QUnit.skip('value event returns fully merged results for RecordField');