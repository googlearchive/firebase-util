
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

var subscriptions = [];
var setup = {
  beforeEach: function(assert) {
    this.fbRef = new Firebase(URL).push();
    this.fbRef.onDisconnect().remove();
    this.fbRef.set(SEED_DATA_FOR_TEST, assert.async());
  },

  afterEach: function(assert) {
    subscriptions.forEach(function(sub) {
      sub.ref.off(sub.event, sub.fn);
    });
    subscriptions = [];
    this.fbRef.remove(assert.async());
    Firebase.util.logLevel();
  }
};

// create a Firebase listener that can be cleaned up after the test
// to ensure tests do not conflict with one another
function subscribe(ref, event, fn, errFn) {
  subscriptions.push({ref: ref, event: event, fn: fn});
  return ref.on(event, fn, errFn || function(err) { throw new Error(err); });
}

function subscribeOnce(ref, fn, errFn) {
  subscriptions.push({ref: ref, event: 'value', fn: fn});
  return ref.once('value', fn, errFn || function(err) { throw new Error(err); });
}

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
  subscribeOnce(ref, function(snap) {
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
  }, done);
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
  subscribe(ref, 'child_added', function(snap) {
    var key = keys.shift();
    assert.equal(snap.key(), key);
    assert.deepEqual(snap.val(), vals[key]);
  }, done);
  subscribeOnce(ref, done, done);
});

QUnit.test('set() writes correct data to each path', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref();
  ref.set({kato: {nick: 'Kato', name: 'katokato', style: 'MMA'}, bruce: null}, function(err) {
    assert.equal(err, null);
    subscribeOnce(fbRef.child('nicknames'), function(nickSnap) {
      subscribeOnce(fbRef.child('users'), function(userSnap) {
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
    subscribeOnce(fbRef.child('nicknames'), function(nickSnap) {
      subscribeOnce(fbRef.child('users'), function(userSnap) {
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

QUnit.test('manipulating data can trigger child_added and child_removed events for filtered values', function(assert) {
  assert.expect(7);
  var done = assert.async();
  var fbRef = this.fbRef;

  fbRef.child('users/chuck/filtered').set(true, function() {
    // create our normalized collection
    var normRef = new Firebase.util.NormalizedCollection(
      fbRef.child('users'),
      fbRef.child('nicknames')
    ).select(
      'users.name',
      'users.style',
      'users.filtered',
      { 'key':'nicknames.$value', 'alias':'nick' }
    ).filter(
      function(data) {
        return data.filtered !== true;
      }
    ).ref();

    var adds = [], removes = [], changes = [], values = [];
    subscribe(normRef, 'child_added', function(snap) {
      adds.push(snap.key());
    });
    subscribe(normRef, 'child_removed', function(snap) {
      removes.push(snap.key());
    });
    subscribe(normRef, 'child_changed', function(snap) {
      changes.push(snap.key());
    });
    subscribe(normRef, 'value', function(snap) {
      values = Object.keys(snap.val());
    });

    // give events time to process
    normRef.once('value', function() {
      assert.deepEqual(values, ['bruce'], 'Chuck should be filtered initially and not in value event');
      assert.deepEqual(adds, ['bruce'], 'Chuck should be filtered initially and not in child_added event');
      fbRef.child('users/chuck/filtered').set(false, function() {
        setTimeout(function() {
          assert.deepEqual(adds, ['bruce', 'chuck'], 'Chuck should trigger add event if removed from filtering');
          assert.deepEqual(values, ['bruce', 'chuck'], 'Chuck should trigger value event if removed from filtering');
          assert.equal(changes.length, 0, 'Chuck should not trigger a change if removed from filtering');
          fbRef.child('users/chuck/filtered').set(true, function() {
            // give events time to finish
            setTimeout(function() {
              assert.deepEqual(removes, ['chuck'], 'Chuck should trigger remove event if filtered again');
              assert.equal(changes.length, 0, 'Chuck should not trigger a change if filtered again');
              done();
            }, 100);
          });
        }, 100);
      });
    });
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
  subscribeOnce(ref, function(snap) {
    assert.deepEqual(snap.val(), {name: "Bruce Lee", style: "Jeet Kune Do", $value: "Little Phoenix"});
    done();
  }, done);
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
  subscribe(ref, 'child_added', function(snap) {
    assert.equal(snap.key(), keys.shift());
  }, done);
  subscribeOnce(this.fbRef, done, done);
});

QUnit.test('set() writes correct data to each path', function(assert) {
  assert.expect(4);
  var done = assert.async();
  var fbRef = this.fbRef;
  var nc = new Firebase.util.NormalizedCollection(fbRef.child('users'), fbRef.child('nicknames'));
  var ref = nc.select('users.name', 'users.style', {key: 'nicknames.$value', alias: 'nick'}).ref().child('bruce');
  ref.set({nick: 'Brucie', name: 'brucebruce'}, function(err) {
    assert.equal(err, null);
    subscribeOnce(fbRef.child('nicknames/bruce'), function(nickSnap) {
      subscribeOnce(fbRef.child('users/bruce'), function(userSnap) {
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
    subscribeOnce(fbRef.child('nicknames/bruce'), function(nickSnap) {
      subscribeOnce(fbRef.child('users/bruce'), function(userSnap) {
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
  subscribeOnce(ref, function(snap) {
    assert.equal(snap.ref().toString(), fbRef.child('/nicknames/bruce').toString());
    assert.deepEqual(snap.val(), "Little Phoenix");
    done();
  }, done);
});

QUnit.test('child_added triggers for correct keys', function(assert) {
  assert.expect(3);
  var done = assert.async();
  var nc = new Firebase.util.NormalizedCollection(this.fbRef.child('feeds'));
  var ref = nc.select('feeds.members').ref().child('TheDojo/members');
  var keys = ['bruce', 'chuck', 'kato'];
  subscribe(ref, 'child_added', function(snap) {
    assert.equal(snap.key(), keys.shift());
  });
  subscribeOnce(this.fbRef, done, done);
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

QUnit.module('NormalizedCollection', setup);

QUnit.test('child_added event is triggered when all set() ops have returned', function(assert) {
  assert.expect(5);
  var done = assert.async();
  var fbRef = this.fbRef;

  var ref = new Firebase.util.NormalizedCollection(
    fbRef.child('users'),
    fbRef.child('nicknames')
  ).select(
    'users.name',
    'users.style',
    'users.test',
    { 'key':'nicknames.$value', 'alias':'nick' }
  )
  .ref();

  var expectedKeys = ['bruce', 'chuck', 'seagal'];
  subscribe(ref, 'child_added', function(snap) {
    var key = expectedKeys.shift();
    assert.equal(snap.key(), key, 'Child added event returns key ' + key);
  }, done);

  // make sure all existing records are downloaded before we add another
  // otherwise the newly added one is triggered by Firebase before the others
  subscribeOnce(fbRef, function() {
    assert.equal(expectedKeys.length, 1, 'Should have one key left after initial load');
    fbRef.child('users').child('seagal').set({
      'name'   : 'Steven Frederic Seagal',
      'style'  : 'Aikido',
      'test'   : true
    }, function(uerr) {
      fbRef.child('nicknames/seagal').set('Seagal', function (nerr) {
        assert.equal(expectedKeys.length, 0, 'All expected keys have been received');
        done(uerr||nerr);
      });
    })
  })
});

QUnit.test('Realtime all the things (a big test of sequential ops with filtering)', function(assert) {
  //Firebase.util.logLevel('debug');

  var done = assert.async();
  var fbRef = this.fbRef;

  var operations = [
    {
      name: "set nick then user",
      expect: 2,
      setup: function () {
        return setNick().delay(10).then(setUser);
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_added', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck', 'seagal']);
      }
    },

    {
      name: 'remove user then nick',
      expect: 2,
      setup: function () {
        return removeUser().delay(10).then(removeNick);
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_removed', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck']);
      }
    },


    {
      name: 'set user then nick',
      expect: 4,
      setup: function () {
        return setUser().delay(10).then(setNick);
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_added', 'seagal');
        eventMonitor.expect('child_changed', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck', 'seagal']);
        eventMonitor.expect('value', ['bruce', 'chuck', 'seagal']);
      }
    },

    {
      name: 'remove nick then user',
      expect: 4,
      setup: function() {
        return removeNick().delay(10).then(removeUser);
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_changed', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck', 'seagal']);
        eventMonitor.expect('child_removed', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck']);
      }
    },

    {
      name: 'add filtered user',
      expect: 0,
      setup: setFilteredUser,
      test: function() {}
    },

    {
      name: 'unfilter existing record',
      expect: 2,
      setup: function() {
        return changeFilterStatus(false)
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_added', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck', 'seagal']);
      }
    },

    {
      name: 'filter existing record',
      expect: 2,
      setup: function() {
        return changeFilterStatus(true)
      },
      test: function(eventMonitor) {
        eventMonitor.expect('child_removed', 'seagal');
        eventMonitor.expect('value', ['bruce', 'chuck']);
      }
    },

    {
      name: 'remove filtered user',
      expect: 0,
      setup: removeUser,
      test: function() {}
    }
  ];

  var assertionsExpected = 0;
  operations.forEach(function(op) {
    assertionsExpected += op.expect;
  });

  // create our normalized collection
  var normRef = new Firebase.util.NormalizedCollection(
    fbRef.child('users'),
    fbRef.child('nicknames')
  ).select(
    'users.name',
    'users.style',
    'users.filtered',
    { 'key':'nicknames.$value', 'alias':'nick' }
  ).filter(
    function(data, key) {
      var match = data.filtered !== true;
      if( !match ) { log('Filtered', key); }
      return match;
    }
  )
  .ref();

  var eventMonitor = EventMonitor(assert, normRef, log);
  var runAllOps = initOpsRunner(eventMonitor, operations);

  subscribeOnce(normRef, function() {
    // should trigger previously established child events
    // before the once(value) event is returned
    eventMonitor.expect('child_added', 'bruce');
    eventMonitor.expect('child_added', 'chuck');
    eventMonitor.expect('value', ['bruce', 'chuck']);

    assertionsExpected += 3;
    assert.expect(assertionsExpected);

    // run all the ops
    log('----starting ops----');
    runAllOps()
      .then(function(){ log('----all ops complete----'); })
      .then(eventMonitor.destroy)
      .fail(function(err) {
        console.error(err);
        return err;
      })
      .then(done)
      .done();
  }, done);

  ////////////////// SETUP AND MONITORING //////////////////////

  function initOpsRunner(eventMonitor, operations) {
    var currentOpNumber = 0;
    var currentOp;
    var ops = operations.slice();

    function runNext() {
      if( ops.length ) {
        currentOpNumber++;
        currentOp = ops.shift();
        log('=========== running ' + "OP" + currentOpNumber + " (" + currentOp.name + ')');
        return currentOp.setup()
          .delay(100)
          .then(currentOp.test.bind(null, eventMonitor))
          .then(eventMonitor.assertNoEventsLeft.bind(null, currentOp.name))
          .then(runNext);
      }
      else {
        // give it a bit more time to watch for stray events
        return Q.when(true).delay(250);
      }
    }

    return runNext;
  }

  function log(txt) {
    // uncomment for console logging
    var args = Array.prototype.slice.call(arguments, 0);
    console.log.apply(console, args);
  }

  ////////////////// WRITE FUNCTIONS //////////////////////

  function setNick() {
    log('setNick invoked');
    var deferred = Q.defer();
    fbRef.child('nicknames/seagal').set('Seagal', deferred.makeNodeResolver());
    return deferred.promise;
  }

  function setUser() {
    log('setUser invoked');
    var deferred = Q.defer();
    fbRef.child('users/seagal').set({
      'name'   : 'Steven Frederic Seagal',
      'style'  : 'Aikido'
    }, deferred.makeNodeResolver());
    return deferred.promise;
  }

  function changeNick() {
    log('changeNick invoked');
    var deferred = Q.defer();
    fbRef.child('nicknames/seagal').set('NewNick', deferred.makeNodeResolver());
    return deferred.promise;
  }

  function removeNick() {
    log('removeNick invoked');
    var deferred = Q.defer();
    fbRef.child('nicknames/seagal').remove(deferred.makeNodeResolver());
    return deferred.promise;
  }

  function removeUser() {
    log('removeUser invoked');
    var deferred = Q.defer();
    fbRef.child('users/seagal').remove(deferred.makeNodeResolver());
    return deferred.promise;
  }

  function setFilteredUser() {
    log('setFilteredUser invoked');
    var deferred = Q.defer();
    fbRef.child('users/seagal').set({
      'name'   : 'Steven Frederic Seagal',
      'style'  : 'Aikido',
      'filtered': true
    }, deferred.makeNodeResolver());
    return deferred.promise;
  }

  function changeFilterStatus(b) {
    log('changeFilterStatus invoked');
    var deferred = Q.defer();
    fbRef.child('users/seagal/filtered').set(b, deferred.makeNodeResolver());
    return deferred.promise;
  }

});

function EventMonitor(assert, normRef, log) {
  var receivedEvents = {
    child_added: [], child_removed: [], child_changed: [], child_moved: [], value: []
  };
  var subs = [];

  ['value', 'child_added', 'child_removed', 'child_moved', 'child_changed'].forEach(function(event) {
    var fn = subscribe(normRef, event, function(snap) {
      var keyData = event === 'value'? Object.keys(snap.val()||{}) : snap.key();
      if( log ) { log(event + ' event for', keyData); }
      receivedEvents[event].push(keyData);
    });
    subs.push([event, fn]);
  });

  return {
    expect: function (eventName, key) {
      var event = receivedEvents[eventName].shift();
      assert.deepEqual(
        event,
        key,
        'Creates ' + eventName + ' event with key' + (eventName === 'value' ? 's' : '') + ' ' + key
      );
    },

    assertNoEventsLeft: function(opName) {
      for(var key in receivedEvents) {
        if( receivedEvents.hasOwnProperty(key) ) {
          var len = receivedEvents[key].length;
          if( len > 0 ) {
            throw new Error('Should be no ' + key + ' events left after "' + opName + '", but count was ' + len);
          }
        }
      }
    },

    destroy: function() {
      subs.forEach(function(sub) {
        normRef.off.apply(normRef, sub);
      });

      if( log ) { log('Event monitoring destroyed'); }
    }
  }
}
