const fs = require("fs");
const fsExtra = require("fs-extra");
const path = require("path");
const mergeStream = require("merge-stream");
const gulp = require("gulp");
const { src, dest, series, parallel } = require("gulp");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");
const concat = require("gulp-concat");
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const autoprefixer = require("gulp-autoprefixer");
const sourcemaps = require("gulp-sourcemaps");
const gulpif = require("gulp-if");
const bs = require("browser-sync");
const babel = require("gulp-babel");

const globalSrc = path.join(__dirname, "assets/global/src");
const globalDist = path.join(__dirname, "assets/global/dist");
const componentSrc = path.join(__dirname, "assets/components/src");
const componentDist = path.join(__dirname, "assets/components/dist");

const env = process.env.NODE_ENV || "development";

const isDevelopment = env === "development";

const filesToWatch = [
    "assets/global/src/css/**/*.scss",
    "assets/global/src/js/**/*.js",
    "assets/components/src/**/*.scss",
    "assets/components/src/**/*.js",
];

const allFilesForReload = [
    "assets/global/src/**/*.scss",
    "assets/global/src/**/*.js",
    "assets/components/src/**/*.scss",
    "assets/components/src/**/*.js",
];

const emptyDir = () => {
    fsExtra.emptyDirSync(componentDist);
    fsExtra.emptyDirSync(globalDist);
    /* 
    Need to return a promise to signal completion, 
    synchronous tasks do not work in gulp 4.*+
    */
    return Promise.resolve();
};

const getFolders = (dir) =>
    fs
        .readdirSync(dir)
        .filter((file) => fs.statSync(path.join(dir, file)).isDirectory());

const ComponentJSTranspile = () =>
    mergeStream(
        ...getFolders(componentSrc).map((folder) =>
            src(path.join(componentSrc, folder, "*.js"))
                .pipe(gulpif(isDevelopment, sourcemaps.init()))
                .pipe(babel())
                .pipe(concat(folder + ".js"))
                .pipe(gulpif(!isDevelopment, uglify()))
                .pipe(rename({ extname: ".min.js" }))
                .pipe(gulpif(isDevelopment, sourcemaps.write(".")))
                .pipe(dest(path.join(componentDist, folder)))
        )
    );

const GlobalJSTranspile = () =>
    src(path.join(globalSrc, "/js", "*.js"))
        .pipe(gulpif(isDevelopment, sourcemaps.init()))
        .pipe(babel())
        .pipe(concat("global.js"))
        .pipe(gulpif(!isDevelopment, uglify()))
        .pipe(rename({ extname: ".min.js" }))
        .pipe(gulpif(isDevelopment, sourcemaps.write(".")))
        .pipe(dest(path.join(globalDist)));


const GlobalSCSSTranspile = () =>
    src(path.join(globalSrc, "/css", "styles.scss"))
        .pipe(gulpif(isDevelopment, sourcemaps.init()))
        .pipe(sass())
        .pipe(concat("styles.css"))
        .pipe(autoprefixer())
        .pipe(gulpif(!isDevelopment, cleanCSS()))
        .pipe(gulpif(isDevelopment, sourcemaps.write(".")))
        .pipe(dest(path.join(globalDist)));

const ComponentSCSSTranspile = () =>
    mergeStream(
        ...getFolders(componentSrc).map((folder) =>
            src(path.join(componentSrc, folder, "*.scss"))
                .pipe(gulpif(isDevelopment, sourcemaps.init()))
                .pipe(sass())
                .pipe(concat(folder + ".css"))
                .pipe(autoprefixer())
                .pipe(gulpif(!isDevelopment, cleanCSS()))
                .pipe(gulpif(isDevelopment, sourcemaps.write(".")))
                .pipe(dest(path.join(componentDist, folder)))
        )
    );

const browserSync = () => {
    return bs.init({
        proxy: "http://localhost:8080",
        files: allFilesForReload,
        injectChanges: true,
    });
};

const build = series(
    emptyDir,
    GlobalSCSSTranspile,
    GlobalJSTranspile,
    ComponentJSTranspile,
    ComponentSCSSTranspile
);

const watch = series(function watchFiles() {
    // browserSync();
    return gulp.watch(filesToWatch, build);
});

exports.build = build;
exports.default = build;
exports.watch = watch;
exports.bs = browserSync;
