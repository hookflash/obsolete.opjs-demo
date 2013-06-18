
const SERVER = require("../server/server");

module.exports = function(grunt) {

  'use strict';

  grunt.initConfig({
    jshint: {
      options: {
        undef: true,
        unused: true,
        strict: true,
        quotmark: 'single'
      },
      dev: {
        options: {
          node: true
        },
        files: {
          src: ['Gruntfile.js']
        }
      },
      client: {
        options: {
          browser: true,
          devel: true,
          globals: {
            require: true,
            define: true
          }
        },
        files: {
          src: ['public/scripts/modules/*.js', 'public/scripts/*.js']
        }
      },
      clientTests: {
        options: {
          browser: true,
          globals: {
            define: true,
            assert: true,
            suite: true,
            suiteSetup: true,
            test: true
          }
        },
        files: {
          src: ['test/client/tests/*.js']
        }
      }
    },
    requirejs: {
      compile: {
        options: {
          paths: {
            "rolodex": "empty:",
            "rolodex-presence": "empty:"
          },
          almond: false,
          mainConfigFile: "public/scripts/require-config.js",
          deps: [],
//          optimize: "none",
          preserveLicenseComments: false,
          optimize: "uglify2",
          generateSourceMaps: true,
          out: "public/scripts/dist/app.js",
          exclude: [
            "config"
          ],
          name: "app",
          logLevel: 0,
          onBuildWrite: function (moduleName, path, contents) {            
            if (moduleName === "app") {
              contents = contents.replace(/^define\('app',/, "define(");
            }
            return contents;
          }
        }
      }
    },
    'saucelabs-mocha': {
        all: {
            options: {
                urls: ["http://127.0.0.1:8080/index.html"],
                tunnelTimeout: 5,
                build: process.env.TRAVIS_JOB_ID || "manual-local",
                concurrency: 2,
                browsers: [
                  {
                    browserName: "chrome",
                    platform: "linux"
                  }
                ],
                testname: "client tests",
                tags: [ process.env.TRAVIS_BRANCH || "local" ]
            }
        }
    }
/*
    },
    mocha: {
      index: ['test/client/index.html']
*/
  });


  var serverInfo = null;

  grunt.registerTask('server-start', 'Start server', function() {
    var done = this.async();
    SERVER.main({
      test: true
    }, function(err, info) {
        if (err) throw err;
        serverInfo = info;
        done();
    });
  });

  grunt.registerTask('server-stop', 'Stop server', function() {
    var done = this.async();
    return serverInfo.server.close(function() {
        return done();
    });
  });

  // Load all grunt related npm packages.
  for (var alias in grunt.file.readJSON('package.json').devDependencies) {
    if (/^grunt.+$/.test(alias)) grunt.loadNpmTasks(alias);
  }

//  grunt.registerTask('test', ['mocha']);
  grunt.registerTask('test', ['server-start', 'saucelabs-mocha', 'server-stop']);
  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('dist', ['requirejs']);

};
