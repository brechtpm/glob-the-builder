var Build = require('../../cli')
var fs = require('fs')
var path = require('path')

var build = new Build(path.join(__dirname, '/target'))

build.add('sync.txt', function (target) {
  fs.writeFileSync(path.join(build.dir, target.path), 'sync test', 'utf8')
})

build.add('callback.txt', function (target, done) {
  fs.writeFile(path.join(build.dir, target.path), 'callback test', 'utf8', done)
}, { useCallback: true })

build.make()
