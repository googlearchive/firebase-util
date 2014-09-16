
var util = require('./libs/util.js');

util.extend(exports, require('./libs/args.js'));
util.extend(exports, require('./libs/logger.js'));
util.extend(exports, require('./libs/Observable.js'));
util.extend(exports, require('./libs/Observer.js'));
util.extend(exports, require('./libs/queue.js'));
util.extend(exports, util);