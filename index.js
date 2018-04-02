var assert = require('assert')
var fs = require('fs')
var glob = require('pull-glob')
var mkdir = require('mkdirp')
var minimatch = require('minimatch')
var match = (pattern, target) => !pattern || minimatch(pattern, target)
var minimist = require('minimist')
var path = require('path')
var pull = require('pull-stream')
var rm = require('rimraf')

class Build {
  constructor (dir) {
    this.targets = {}
    this.dir = dir
  }

  static dest (dir) {
    return new Build(dir)
  }

  add (target, fn) {
    assert.ok(typeof target === 'string', 'Invalid target: ' + target)
    assert.ok(typeof fn === 'function', 'Invalid target handler for ' + target)
    this.targets[target] = fn
  }

  clean (files, cb) {
    rm(files.pop(), err => {
      if (err) {
        return cb(err)
      }
      if (files.length) {
        return this.clean(files, cb)
      }
      cb()
    })
  }

  command (cb) {
    var cmdOpts = {
      boolean: ['all', 'a', 'clean', 'c']
    }
    var done = function (err) {
      if (err) {
        if (cb) cb(err)
        else throw err
      }
    }
    var opts = minimist(process.argv.slice(2), cmdOpts)
    var patterns = opts._

    if (opts.clean || opts.c) {
      this.clean(this.files, err => {
        if (err) done(err)
        if (opts.all || opts.a) {
          this.make(null, done)
        } else if (patterns.length) {
          this.make(patterns, done)
        }
      })
    } else if (opts.all || opts.a) {
      this.make(null, done)
    } else if (patterns.length) {
      this.make(patterns, done)
    }
  }

  fixit (pattern, target, cb, isMatch) {
    if (isMatch !== true) {
      assert.ok(match(pattern, target), target + ' does not match requested target ' + pattern)
    }
    var source = this.targets[target](this.parse(pattern || target))
    if (typeof source !== 'function') {
      return this.scan(target, cb)
    }
    pull(
      source,
      pull.drain(file => {
        mkdir(path.dirname(file.path))
        fs.writeFile(file.path, file.contents, file.enc || file.encoding, cb)
      }, err => {
        if (err) return cb(err)
        this.scan(target, cb)
      })
    )
  }

  make (patterns, cb) {
    if (!Array.isArray(patterns)) {
      patterns = [patterns]
    }
    patterns.forEach(pattern => {
      if (this.targets[pattern]) {
        this.fixit(pattern, pattern, cb, true)
      } else {
        for (var target in this.targets) {
          if (target !== pattern && match(pattern, target)) {
            this.fixit(pattern, target, cb, true)
            if (pattern) break
          }
        }
      }
    })
  }

  parse (target) {
    var parsed = path.parse(target)
    parsed.dir = path.join(this.dir, parsed.dir)
    return parsed
  }

  scan (target, cb) {
    var match = false
    pull(
      glob(path.join(this.dir, target)),
      pull.take(1),
      pull.drain(() => {
        match = true
      }, () => {
        if (!match) cb(new Error('No files were created for target ' + target))
        else cb()
      })
    )
  }

  get files () {
    return Object.keys(this.targets).map(target => path.join(this.dir, target))
  }
}

module.exports = Build
