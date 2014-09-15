/* global module */

module.exports = function(grunt) {
   'use strict';

   //todo add a grunt task to read all packages in src/ and link to their readme files and descriptions

   grunt.initConfig({
      pkg: grunt.file.readJSON('package.json'),
      banner: '/*!\n' +
              ' * Firebase-util is a set of experimental power tools for Firebase.\n' +
              ' *\n' +
              ' * Firebase-util 0.0.0\n' +
              ' * https://github.com/firebase/firebase-util/\n' +
              ' * Date: <%= grunt.template.today("mm/dd/yyyy") %>\n' +
              ' * License: MIT\n' +
              ' */\n\n' +
              '(function(exports) {\n',
      footer: '\n})( typeof window !== "undefined"? [window.Firebase.util = {}][0] : module.exports );\n',

      concat: {
         app: {
            options: { banner: '<%= banner %>', footer: '<%= footer %>' },
            src: [
               'src/global/*.js',
               'src/join/libs/*.js',
               'src/join/exports.js'
            ],
            dest: 'dist/firebase-util.js'
         }
      },

      uglify: {
         options: {
            preserveComments: 'some'
         },
         app: {
            files: {
               'dist/firebase-util.min.js': ['dist/firebase-util.js']
            }
         }
      },

      watch: {
         build: {
            files: ['src/**/*.js', 'Gruntfile.js'],
            tasks: ['make'],
            options: {
               interrupt: true
            }
         },
         test: {
            files: ['src/**/*.js', 'Gruntfile.js', 'test/**'],
            tasks: ['test']
         }
      },

      // Configure a mochaTest task
      mochaTest: {
         test: {
            options: {
               growl: true,
               timeout: 5000,
               reporter: 'spec'
            },
            require: [
               "chai"
            ],
            log: true,
            src: ['test/*.js']
         }
      }

   });

   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-exec');
   grunt.loadNpmTasks('grunt-contrib-watch');
   grunt.loadNpmTasks('grunt-notify');
   grunt.loadNpmTasks('grunt-mocha-test');

   grunt.registerTask('make', ['concat', 'uglify']);
   grunt.registerTask('test', ['make', 'mochaTest']);

   grunt.registerTask('default', ['make', 'test', 'watch']);
};
