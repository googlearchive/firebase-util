// place fbutil onto Firebase.util namespace
// if we are in the browser and Firebase exists
if( global.Firebase ) {
  global.Firebase.util = require('firebase-util');
}