/**
 * Gruntfile
 *
 * This Node script is executed when you run `grunt`-- and also when
 * you run `sails lift` (provided the grunt hook is installed and
 * hasn't been disabled).
 *
 * WARNING:
 * Unless you know what you're doing, you shouldn't change this file.
 * Check out the `tasks/` directory instead.
 *
 * For more information see:
 *   https://sailsjs.com/anatomy/Gruntfile.js
 */
module.exports = function(grunt) {

  var loadGruntTasks = require('sails-hook-grunt/accessible/load-grunt-tasks');

  // Don't outlive whoever started us.
  //
  // In development the `default` tasklist ends in `watch`, so this process never
  // exits on its own.  `sails-hook-grunt` forks us and only kills us from
  // `sails.lower()` -- which never runs if Sails dies abruptly (`kill -9`, a
  // `forever -w` reload, the terminal going away).  When that happens we get
  // reparented to init and keep running forever, ~110MB and an inotify watch on
  // `assets/**` apiece.  Enough reloads and the machine starts swapping.
  //
  // `fork()` gives us an IPC channel, and its far end closes even when the
  // parent is SIGKILLed, so `disconnect` is a reliable death notice.
  if (process.connected) {
    process.on('disconnect', function onParentGone() {
      process.exit(0);
    });
  }

  // Fallback for invocations with no IPC channel (a bare `grunt` from a shell):
  // getting reparented means our parent is gone.  Unref'd so a one-shot tasklist
  // such as `build` or `prod` can still exit on its own.
  var initialPpid = process.ppid;
  setInterval(function checkParent() {
    if (process.ppid !== initialPpid) {
      process.exit(0);
    }
  }, 5000).unref();

  // Load Grunt task configurations (from `tasks/config/`) and Grunt
  // task registrations (from `tasks/register/`).
  loadGruntTasks(__dirname, grunt);

};
