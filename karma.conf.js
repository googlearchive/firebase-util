module.exports = function(config) {
  config.set({
    files: [
      'test/lib/*.js',
      'test/NormalizedCollection/FieldMap.spec.js'
//      'test/**/*.spec.js'
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'test/**/*.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    reporters: ['spec', 'failed', 'growl'],
    browserify: {
      debug: true
    }
  });
};