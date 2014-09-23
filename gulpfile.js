'use strict';

var gulp       = require('gulp');
var plugins    = require('gulp-load-plugins')();
var browserify = require('browserify');
var source     = require('vinyl-source-stream');
var buffer     = require('vinyl-buffer');
var karma      = require('karma-as-promised');
var fs         = require('fs');

function getBundle(debug, args) {
  return browserify({debug: debug||false}, args)
    .external('firebase', {expose: 'firebase'})
    .require('./src/fbutil.js', {expose: 'firebase-util'})
    .add('./src/expose.js');
}

gulp.task('build', function(){
  return getBundle()
    .bundle()
    .pipe(source('./firebase-util.js'))
    .pipe(buffer())
    .pipe(plugins.header(fs.readFileSync('./gulp/header.txt'), {
      pkg: require('./package.json')
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
  return karma.server.start({
    configFile: __dirname + '/karma.conf.js'
  });
});

gulp.task('test', function () {
  return karma.server.start({
    configFile: __dirname+'/karma.conf.js',
    singleRun: true
  });
});

//todo include the debug maps as external files
gulp.task('minify', function() {
  getBundle()
    .bundle()
    .pipe(source('./firebase-util.min.js'))
    .pipe(buffer())
    .pipe(plugins.uglify())
    .pipe(plugins.size())
    .pipe(gulp.dest('dist'));
});

gulp.task('lint', function () {
  return gulp.src(['./gulpfile.js', './src/**/*.js', './test/**/*.spec.js'])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('bundle', ['lint', 'build', 'minify']);
gulp.task('default', ['bundle', 'test']);
