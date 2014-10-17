'use strict';

var util = require('../../common');

function Query(ref, record) {
  this._ref = ref;
  // coupling: this is referenced directly by NormalizedSnapshot.js
  this._rec = record;
}

Query.prototype = {
  'on': function() {}, //todo

  'once': function() {}, //todo

  'off': function() {}, //todo

  'limit': function() {}, //todo

  'startAt': function() {}, //todo

  'endAt': function() {}, //todo

  'equalTo': function() {}, //todo

  'ref': function() { return this._ref; },

  /****************************
   * PACKAGE FUNCTIONS (not API)
   ***************************/

  '_getRec': function() { return this._rec; }
};

util.registerFirebaseWrapper(Query);
module.exports = Query;