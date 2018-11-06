var Build = require('../../')
var autoprefixer = require('gulp-autoprefixer')
var cli = require('../../cli')
var cssnano = require('gulp-cssnano')
var less = require('gulp-less')
var gulp = require('vinyl-fs')
var path = require('path')

var build = Build.dest(path.join(__dirname, '/target'))

build.add('*.css', async function (target) {
  await target.prune()

  var name = target.wildcards[0]
  var pipeline = gulp.src(path.join(__dirname, 'src', name + '.less'))
    .pipe(less())
    .pipe(autoprefixer())
    .pipe(cssnano())

  for await (var file of pipeline) {
    await target.write(file)
  }
})

cli(build)
