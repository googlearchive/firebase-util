module.exports = function(config) {
  config.set({
    files: [
      'test/lib/jasmineMatchers.js',
      'test/**/*.spec.js'
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'test/**/*.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    reporters: ['spec', 'failed', 'growl'],
    browserify: {
      debug: true,
      transform: ['browserify-istanbul']
    }
  });
};