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

var chokidar = require('chokidar');

function AnnotationScanner(logger, scannedAnnotations, $registerByConstructor, $unregister, $resolve) {

    //--------------------------------------------------------------------------
    //  Members        
    var self = this;

    var watcher = null;

    var rootPath = process.cwd();

    var serviceNameNAnnotationMap = {};

    //--------------------------------------------------------------------------
    //  Method binding

    /**
     * List of string or just one string
     * @param {type} paths
     * @returns {nm$_annotation-scanner.Promise}
     */
    this.scan = function (paths) {
        return new Promise(function (resolve, reject) {
            scanAnnotationsByPath(paths)
                .then(function (fileAnnotations) {
                    for (var filePath in fileAnnotations) {
                        var annotations = fileAnnotations[filePath];
                        var serviceAnnotation = validateAnnotations(annotations, filePath);
                        if (serviceAnnotation != null) {
                            try {
                                loadService(serviceAnnotation, filePath);
                            } catch (error) {
                                logger.log("Load file: " + filePath + " fails. Reason: " + error.stack);
                            }
                        }
                    }
                    resolve();

                })
                .catch(reject);
        });
    };

    this.watch = function (paths) {
        if (watcher != null) {
            throw new Error("Invalid state, watcher is running");
        }
        //ELSE:
        return new Promise(function (resolve, reject) {
            self.scan(paths)
                .then(function () {
                    watcher = chokidar.watch(paths, {
                        persistent: true,
                        ignoreInitial: true
                    });
                    watcher
                        .on("add", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been added, path: " + filePath);
                                self.scan([filePath]);
                            }
                        })
                        .on("change", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been changed, path: " + filePath);
                                var serviceName = getServiceNameByFilePath(filePath);
                                if (serviceName != null && $resolve(serviceName) != null) {
                                    $unregister(serviceName);
                                }
                                self.scan([filePath]);
                            }
                        })
                        .on("unlink", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been deleted, path: " + filePath);
                                var serviceName = getServiceNameByFilePath(filePath);
                                if (serviceName != null) {
                                    $unregister(serviceName);
                                    unlinkFilePathAndServiceName(filePath, serviceName);
                                }
                            }
                        });
                    resolve();
                })
                .catch(reject);
        });
    };

    this.close = function () {
        if (watcher != null) {
            watcher.close();
        }
        filePathNServiceNameMap = null;
        serviceNameNFilePathMap = null;
    };

    //--------------------------------------------------------------------------
    //  Utils   

    function validateAnnotations(annotations, filePath) {
        var retVal = null;
        var foundValidAnnotations = [];
        scannedAnnotations.forEach(function (scannedAnnotation) {
            var count = _(annotations).filter(function (annotation) {
                if (annotation.name == scannedAnnotation) {
                    retVal = annotation;
                    return true;
                } else {
                    return false;
                }
            }).length;

            if (count > 1) {
                throw new Error("Found more than ONE annotation " + scannedAnnotation + " in file " + filePath);
            } else if (count == 1) {
                foundValidAnnotations.push(scannedAnnotation);
            }
        });
        if (foundValidAnnotations.length > 1) {
            throw Error("Just allows ONE of follwong annotaion but found multi-annotations in file: "
                + filePath + "; annotations: " + foundValidAnnotations.join(", "));
        }
        return foundValidAnnotations.length == 1 ? retVal : null;
    }

    function scanAnnotationsByPath(paths) {
        var fileAnnotations = {};
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
                    resolve(fileAnnotations);
                })
                .catch(reject);
        });
    }

    function loadService(serviceAnnotation, filePath) {
        var serviceName = serviceAnnotation.parameters["name"];
        //ELSE:
        var stdFilePath = path.join(rootPath, filePath);
        delete require.cache[require.resolve(stdFilePath)];
        var serviceConstructor = require(stdFilePath);
        $registerByConstructor(serviceName, serviceConstructor);
        serviceNameNAnnotationMap[serviceName] = serviceAnnotation.name;
        linkFilePathAndServiceName(filePath, serviceName);
    }

    var filePathNServiceNameMap = {};

    var serviceNameNFilePathMap = {};

    function linkFilePathAndServiceName(filePath, serviceName) {
        filePathNServiceNameMap[filePath] = serviceName;
        serviceNameNFilePathMap[serviceName] = filePath;
    }

    function unlinkFilePathAndServiceName(filePath) {
        var serviceName = filePathNServiceNameMap[filePath];
        delete filePathNServiceNameMap[filePath];
        delete serviceNameNFilePathMap[serviceName];
    }

    function getServiceNameByFilePath(filePath) {
        return filePathNServiceNameMap[filePath];
    }
}


