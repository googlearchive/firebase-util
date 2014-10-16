module.exports = function(config) {
  config.set({
    files: [
      'test/lib/*.js',
      'test/NormalizedCollection/RecordField.spec.js'
//      'test/**/*.spec.js'
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'test/**/*.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    reporters: ['spec', 'failed', 'growl', 'beep'],
    browserify: {
      debug: true
    }
  });
};