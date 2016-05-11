/**
 * Copyright (C) 2016, Cloudpify
 *
 * Tho Q Luong <thoqbk@gmail.com>
 *
 * May 6, 2016
 *
 */

module.exports = AnnotationScanner;

var fs = require("fs");

var Fx = require("../lib/fx.js");

var walk = require("walk");

var path = require("path");

var Promise = require("bluebird");

var _ = require("underscore");

function AnnotationScanner(logger) {

    var fileAnnotations = {};

    /**
     * List of string or just one string
     * @param {type} paths
     * @returns {nm$_annotation-scanner.Promise}
     */
    this.scan = function (paths) {
        fileAnnotations = {};
        var promises = [];
        paths.forEach(function (filePath) {
            var promise = new Promise(function (resolve, reject) {
                var fileContents = {};
                fs.stat(filePath, function (error, stats) {
                    if (error != null) {
                        reject(error);
                        return;
                    }
                    //ELSE:
                    if (stats.isDirectory()) {
                        var walker = walk.walk(filePath, {followLink: false});
                        walker.on("file", function (root, fileStats, next) {
                            if (path.extname(fileStats.name) == ".js") {
                                logger.log("Found a .js file: " + fileStats.name);
                                var filePath2 = path.join(root, fileStats.name);
                                fs.readFile(filePath2, "utf8", function (error, data) {
                                    if (error != null) {
                                        reject(error);
                                    } else {
                                        fileContents[filePath2] = data;
                                        next();
                                    }
                                });
                            } else {
                                next();
                            }
                        });
                        walker.on("error", function (root, nodeStatsArray, next) {
                            reject(nodeStatsArray.error);
                        });
                        walker.on("end", function () {
                            resolve(fileContents);
                        });

                    } else if (stats.isFile() && path.extname(filePath) == ".js") {
                        logger.log("Found a .js file: " + filePath);
                        fs.readFile(filePath, "utf8", function (error, data) {
                            if (error != null) {
                                reject(error);
                            } else {
                                fileContents[filePath] = data;
                                resolve(fileContents);
                            }
                        });

                    }
                });
            });
            promises.push(promise);
        });

        return new Promise(function (resolve, reject) {
            Promise.all(promises)
                .then(function () {
                    arguments[0].forEach(function (fileContents) {
                        for (var key in fileContents) {
                            fileAnnotations[key] = Fx.extractAnnotations(fileContents[key]);
                        }
                    });
                    resolve();
                })
                .catch(reject);
        });

    };

    this.getFilesByAnnotation = function (annotationName) {
        var retVal = [];
        for (var filePath in fileAnnotations) {
            var annotations = fileAnnotations[filePath];
            if (_(annotations).where({name: annotationName, enable: true}).length > 0) {
                retVal.push(filePath);
            }
        }
        //return
        return retVal;
    };

    this.getAnnotation = function (filePath, annotationName) {
        return _(fileAnnotations[filePath]).findWhere({name: annotationName, enable: true});
    };
}


