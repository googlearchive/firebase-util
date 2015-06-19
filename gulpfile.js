'use strict';

/**
 * USEFUL COMMANDS:
 *   gulp           bundle and run tests
 *   gulp e2e       bundle, start a server, open e2e tests in browser, watch for changes, livereload
 *   gulp bundle    lint src code, bundle content, and minify
 *   gulp scaffold  create a new class and test unit for that class
 */

var gulp       = require('gulp');
var plugins    = require('gulp-load-plugins')();
var browserify = require('browserify');
var source     = require('vinyl-source-stream');
var buffer     = require('vinyl-buffer');
var karma      = require('karma-as-promised').server;
var fs         = require('fs');
var argv       = require('yargs').argv;
var gutil      = require('gulp-util');
var path       = require('path');
var seq        = require('run-sequence');

function getBundle(pkg) {
  var fileName = 'fbutil' + (pkg? '.' + pkg : '') + '.js';
  return browserify({debug: false})
    .external('firebase', {expose: 'firebase'})
    .require('./src/' + fileName, {expose: 'firebase-util'})
    .add('./src/expose.js');
}

function doMinify(libName) {
  return getBundle(libName).bundle()
    .pipe(source('./firebase-util' + (libName? '-' + libName : '') + '.min.js'))
    .pipe(buffer())
    .pipe(plugins.header(fs.readFileSync('./gulp/header.tpl'), {
      pkg: require('./package.json')
    }))
    .pipe(plugins.uglify({preserveComments: 'some'}))
    .pipe(plugins.size())
    .pipe(gulp.dest('dist'))
    .pipe(plugins.livereload());
}

function copyTemplate(ext, isSpec) {
  if( !argv.t || !argv.d || !argv.n ) {
    gutil.log(gutil.colors.red('Usage: gulp scaffold -t type -d directory -n name'));
    return;
  }

  var baseDir = isSpec? 'test' : 'src';
  var subDir = argv.d;
  if( !isSpec ) { subDir = path.join(subDir, 'libs'); }
  var dest = path.join(baseDir, subDir, argv.n + ext);
  var src = path.join('gulp', argv.t + (isSpec? '.spec' : '') + '.tpl');
  var renameProps = {
    dirname: subDir,
    basename: argv.n,
    extname: ext
  };

  if( fs.existsSync(dest) ) {
    gutil.log(gutil.colors.red('File exists: '+dest));
    return;
  }

  gutil.log('Creating ', gutil.colors.magenta(dest));
  return gulp.src(src)
    .pipe(plugins.template({ name: argv.n }))
    .pipe(plugins.rename(renameProps))
    .pipe(gulp.dest(baseDir));
}

gulp.task('build', function(){
  return getBundle()
    .bundle()
    .pipe(source('./firebase-util.js'))
    .pipe(buffer())
    .pipe(plugins.header(fs.readFileSync('./gulp/header.tpl'), {
      pkg: require('./package.json')
    }))
    .pipe(gulp.dest('dist'))
    .pipe(plugins.livereload());
});

gulp.task('watch', function() {
  return karma.start({
    configFile: __dirname + '/karma.conf.js'
  });
});

gulp.task('test', function () {
  return karma.start({
    configFile: __dirname+'/karma.conf.js',
    singleRun: true
  });
});

//todo include the debug maps as external files
gulp.task('minify', function() {
  return seq('minify-paginate', 'minify-normalize', 'minify-all');
});

gulp.task('minify-paginate', function() {
  return doMinify('paginate');
});

gulp.task('minify-normalize', function() {
  return doMinify('normalize');
});

gulp.task('minify-all', function() {
  return doMinify();
});

gulp.task('lint', function () {
  return gulp.src(['./gulpfile.js', './src/**/*.js', './test/**/*.spec.js'])
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'))
    .pipe(plugins.jshint.reporter('fail'));
});

gulp.task('scaffold-file', function() {
  return copyTemplate('.js');
});

gulp.task('scaffold-test', function() {
  return copyTemplate('.spec.js', true);
});

gulp.task('serve', function() {
  return gulp.src('.')
    .pipe(plugins.webserver({
      livereload: true,
      directoryListing: true,
      open: 'test/e2e/e2etest.html'
    }));
});

gulp.task('e2e', function() {
  return seq('bundle', 'watch', 'serve');
});

gulp.task('watch', function() {
  return gulp.watch(['./src/**/*.js', './test/e2e/**/*'], ['bundle']);
});

gulp.task('scaffold', ['scaffold-file', 'scaffold-test']);

gulp.task('bundle', function() {
  return seq('lint', 'build', 'minify');
});

gulp.task('default', function() {
  return seq('bundle', 'test');
});
