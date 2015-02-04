QUnit.config.testTimeout = 5000;

var setup = {
  beforeEach: function(assert) {
    this.fbRef = new Firebase(URL).push();
    this.fbRef.onDisconnect().remove();
    this.fbRef.set(DEFAULT_DATA, assert.async());
  },

  afterEach: function(assert) {
    this.fbRef.remove(assert.async());
    Firebase.util.logLevel();
  }
};

QUnit.module('Paginate', setup);

QUnit.test('appends next page'); //todo-test

QUnit.test('appends previous page'); //todo-test

QUnit.test('adjusts first key when a record is deleted'); //todo-test

QUnit.test('adjusts first key when a record is added'); //todo-test

QUnit.test('adjusts first key when a record is moved'); //todo-test

QUnit.test('adjusts first key when first key is moved');  //todo-test


Qunit.module('Scroll', setup);

QUnit.test('appends next set'); //todo-test

QUnit.test('appends previous set'); //todo-test

QUnit.test('removes records when window size is exceeded'); //todo-test

QUnit.test('adjusts first key when a record is deleted'); //todo-test

QUnit.test('adjusts first key when a record is added'); //todo-test

QUnit.test('adjusts first key when a record is moved'); //todo-test

QUnit.test('adjusts first key when first key is moved');  //todo-test


var URL = 'https://fbutil.firebaseio.com/test';
var DEFAULT_DATA = {};