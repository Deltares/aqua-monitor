// generated on 2016-03-22 using generator-gulp-webapp 1.1.1
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import {stream as wiredep} from 'wiredep';
import gae from 'gulp-gae';

const debug = require('gulp-debug');

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

gulp.task('styles-scss', () => {
  return gulp.src('app/static/styles/*.scss')
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    .pipe($.sourcemaps.write('../maps'))
    .pipe(gulp.dest('dist/static/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('styles', () => {
  return gulp.src('app/static/styles/*.css')
    .pipe(gulp.dest('dist/static/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', () => {
  return gulp.src('app/static/scripts/*.js')
    //.pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    //.pipe($.uglify({mangle: true}))
    .pipe($.sourcemaps.write('../maps'))
    .pipe(gulp.dest('dist/static/scripts'))
    .pipe(reload({stream: true}));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe(reload({stream: true, once: true}))
      .pipe($.eslint(options))
      .pipe($.eslint.format())
      .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
  }
}

const testLintOptions = {
  env: {
    mocha: true
  }
};

gulp.task('lint', lint('app/static/scripts/**/*.js'));

gulp.task('lint:test', lint('test/spec/**/*.js', testLintOptions));

gulp.task('html', ['styles-scss', 'styles', 'scripts', 'libs'], () => {
  return gulp.src('app/static/*.html')
  //.pipe($.htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('dist/static'));
});

gulp.task('templates', ['styles-scss', 'styles'], () => {

  const htmlFilter = $.filter('**/*.html', {restore: true});
  const otherFilter = $.filter('**/*.html', {restore: true});

  return gulp.src(['app/templates/*.html'])
    .pipe(
      $.useref({searchPath: ['dist', '.']})
    )
    .pipe(
      // html to templates
      gulp.dest('dist/templates'),
    )
    .pipe(
      gulp.dest('dist')
    )
});

gulp.task('images', () => {
  return gulp.src('app/static/images/**/*')
    .pipe($.if($.if.isFile, $.cache($.imagemin({
      progressive: true,
      interlaced: true,
      // don't remove IDs from SVGs, they are often used
      // as hooks for embedding and styling
      svgoPlugins: [{cleanupIDs: false}]
    }))
      .on('error', function (err) {
        console.log(err);
        this.end();
      })))
    .pipe(gulp.dest('dist/static/images'));
});

gulp.task('fonts', () => {
  return gulp.src(require('main-bower-files')('**/*.{eot,svg,ttf,woff,woff2}', function (err) {
  })
    .concat('app/static/fonts/**/*'))
    .pipe(gulp.dest('.tmp/static/fonts'))
    .pipe(gulp.dest('dist/static/fonts'));
});

gulp.task('extras', () => {
  return gulp.src(['app/**/*.yaml', 'app/**/*.pem', 'app/**/*.py', 'app/**/*.txt', 'app/*.json'])
    .pipe(gulp.dest('dist'));
});

gulp.task('libs', () => {
  return gulp.src(['app/static/libs/**/*'])
    .pipe(gulp.dest('dist/static/libs'));
});

gulp.task('watch', () => {
  gulp.watch('app/templates/*', ['templates']);
  gulp.watch('app/static/*.html', ['html']);
  gulp.watch('app/static/styles/**/*.scss', ['styles-scss', 'templates']);
  gulp.watch('app/static/styles/**/*.css', ['styles', 'templates']);
  gulp.watch('app/static/scripts/**/*.js', ['scripts', 'libs']);
  gulp.watch('app/static/fonts/**/*', ['fonts']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
  gulp.watch('app/*.{py,yaml}', ['extras']);
})
;

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve:test', ['scripts'], () => {
  browserSync({
    notify: false,
    port: 9000,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
        '/static/scripts': '.tmp/static/scripts',
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch('app/static/scripts/**/*.js', ['scripts']);
  gulp.watch('test/spec/**/*.js').on('change', reload);
  gulp.watch('test/spec/**/*.js', ['lint:test']);
})
;

// inject bower components
gulp.task('wiredep', () => {
  gulp.src('app/static/styles/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/static/styles'));

  gulp.src('app/templates/*.html')
    .pipe(wiredep({
      exclude: ['bootstrap-sass'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app/templates'));
});

gulp.task('build', ['html', 'images', 'fonts', 'extras', 'templates', 'libs-py'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
})
;

gulp.task('default', ['clean'], () => {
  gulp.start('build');
})
;

gulp.task('serve:gae', function () {
  // on Windows run dev_appserver.py manually, see README.md
  if(process.platform !== "win32") {
    gulp.src('dist/app.yaml')
      .pipe($.plumber())
      .pipe(gae('dev_appserver.py', [], {
        port: 8081,
        host: '0.0.0.0',
        admin_port: 8001,
        admin_host: '0.0.0.0'
      }));
  }
  gulp.watch('app/templates/*.html', ['templates']);
  gulp.watch('app/static/*.html', ['html']);
  gulp.watch('app/static/styles/**/*.scss', ['styles-scss']);
  gulp.watch('app/static/styles/**/*.css', ['styles']);
  gulp.watch('app/static/scripts/**/*.js', ['scripts', 'libs']);
  gulp.watch('app/static/fonts/**/*', ['fonts']);
  gulp.watch('bower.json', ['wiredep', 'fonts']);
  gulp.watch('app/*.{py,yaml}', ['extras']);
});

gulp.task('libs-py', () => {
    return gulp.src(['libs/**/*']).pipe(gulp.dest('dist'));
});

gulp.task('gae-deploy', function () {
  gulp.src('app/app.yaml')
    .pipe(gae('appcfg.py"', ['update'], {
      version: 'dev',
      oauth2: undefined // for value-less parameters
    }));
});
