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

QUnit.skip('appends next page'); //todo-test

QUnit.skip('appends previous page'); //todo-test

QUnit.skip('adjusts first key when a record is deleted'); //todo-test

QUnit.skip('adjusts first key when a record is added'); //todo-test

QUnit.skip('adjusts first key when a record is moved'); //todo-test

QUnit.skip('adjusts first key when first key is moved');  //todo-test


QUnit.module('Scroll', setup);

QUnit.skip('appends next set'); //todo-test

QUnit.skip('appends previous set'); //todo-test

QUnit.skip('removes records when window size is exceeded'); //todo-test

QUnit.skip('adjusts first key when a record is deleted'); //todo-test

QUnit.skip('adjusts first key when a record is added'); //todo-test

QUnit.skip('adjusts first key when a record is moved'); //todo-test

QUnit.skip('adjusts first key when first key is moved');  //todo-test


var URL = 'https://fbutil.firebaseio.com/test';
var DEFAULT_DATA = {};