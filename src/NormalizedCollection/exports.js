
var util = require('../common/index.js');

util.extend(
  exports,
  {
    NormalizedCollection: require('./libs/NormalizedCollection.js')
  },
  require('./libs/constants.js')
);