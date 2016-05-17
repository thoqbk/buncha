/**
 * Copyright (C) 2015, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * Aug 9, 2015 12:25:14 AM
 * 
 */

var Fx = require("./fx");

var _ = require("underscore");

var AnnotationScanner = require("../lib/annotation-scanner.js");

var chokidar = require('chokidar');

var path = require("path");

module.exports = Container;

/**
 * IoC Container
 * 
 * IoC container services:
 * 
 *  $construct
 *  $invoke
 *  $register
 *  $registerByConstructor
 *  $resolve
 *  
 * @param {type} config
 * @returns {Container}
 */

function Container(config) {

    //--------------------------------------------------------------------------
    //  Members
    var self = this;

    var nameNServiceMap = {};//name --> {dependencies, serviceConstructor, service, invalidated: true or false}

    var rootPath = process.cwd();

    var watcher = null;

    var logger = new (require("../lib/logger.js"))(config != null && config.debug);

    //--------------------------------------------------------------------------
    //  Method bindings

    this.construct = function (constructor, missingResolver) {
        var arguments = getArguments(constructor, missingResolver);
        checkNotNullArguments(constructor, arguments);
        return new (constructor.bind.apply(constructor, [null].concat(arguments)))();
    };

    this.invoke = function () {
        var fx, thisContext, missingResolver = null;
        if (arguments.length == 2) {
            fx = arguments[0];
            missingResolver = arguments[1];
        } else if (arguments.length == 3) {
            fx = arguments[0];
            thisContext = arguments[1];
            missingResolver = arguments[2];
        } else {
            throw new Error("Passing invalid parameters in invoke function");
        }
        var arguments = getArguments(fx, missingResolver);
        checkNotNullArguments(fx, arguments);
        return fx.apply(thisContext, arguments);
    };

    this.register = function (serviceName, service) {
        if (service == null) {
            throw new Error("Register null for service " + serviceName);
        }
        //ELSE:
        nameNServiceMap[serviceName] = {
            service: service,
            invalidated: false,
            dependencies: []
        };
        invalidateDependencies(serviceName);
        tryConstructInvalidatedServices();
    };

    this.registerByConstructor = function (serviceName, constructor) {
        if (constructor == null) {
            throw new Error("Register null constructor for service " + serviceName);
        } else if (!Fx.isFunction(constructor)) {
            throw new Error("Register invalid constructor for service"
                + serviceName + ", require function but found " + (typeof constructor));
        }
        var dependencies = Fx.extractParameters(constructor);

        if (dependencies.indexOf(serviceName) >= 0) {
            throw new Error("Service " + serviceName + " depends on itself");
        }
        nameNServiceMap[serviceName] = {
            serviceConstructor: constructor,
            invalidated: true,
            dependencies: dependencies
        };

        invalidateDependencies(serviceName);
        tryConstructInvalidatedServices();
    };

    this.unregister = function (serviceName) {
        invalidateDependencies(serviceName);
        delete nameNServiceMap[serviceName];
    };

    /**
     * 
     * @param {type} query array of service-names or single service name
     * @param {type} missingResolver
     * @returns {Array|service|ServiceProvider.nameNServiceMap|ServiceProvider.resolve.retVal}
     */
    this.resolve = function (query, missingResolver) {
        var retVal = null;
        if (query instanceof Array) {
            retVal = [];
            query.forEach(function (serviceName) {
                var service = resolveService(serviceName, missingResolver);
                retVal.push(service);
            });
        } else {
            retVal = resolveService(query, missingResolver);
        }
        //return
        return retVal;
    };

    /**
     * Scan directories or files to load services
     * 
     * Arguments should be array of string AND/OR string
     * 
     * @returns {Promise}
     */
    this.scan = function () {
        var paths = watchAndScanArgumentsToPaths(arguments);
        return scanPaths(paths);
    };

    /**
     * Scan and watch directories or files to load services 
     * and reload them if the files are changed, deleted or added
     * 
     * @returns {Promise}
     */
    this.watch = function () {
        if (watcher != null) {
            watcher.close();
            watcher = null;
        }
        var paths = watchAndScanArgumentsToPaths(arguments);
        return new Promise(function (resolve, reject) {
            scanPaths(paths)
                .then(function () {
                    watcher = chokidar.watch(paths, {
                        persistent: true,
                        ignoreInitial: true
                    });
                    watcher
                        .on("add", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been added, path: " + filePath);
                                tryLoadServiceFile(filePath);
                            }
                        })
                        .on("change", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been changed, path: " + filePath);
                                tryLoadServiceFile(filePath);
                            }
                        })
                        .on("unlink", function (filePath) {
                            if (path.extname(filePath) == ".js") {
                                logger.log("A .js file has been deleted, path: " + filePath);
                                var serviceName = getServiceNameByFilePath(filePath);
                                self.unregister(serviceName);

                                unlinkFilePathAndServiceName(filePath, serviceName);
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
            watcher = null;
        }
        nameNServiceMap = null;
        filePathNServiceNameMap = null;
        serviceNameNFilePathMap = null;
    };

    /**
     * Describe the dependencies in the container
     * 
     * @returns {nm$_container.exports.toString.retVal|String}
     */
    this.toString = function () {
        var retVal = "Dependency graph:\n";
        //dependency graph
        var dependencyGraph = {};
        for (var serviceName in nameNServiceMap) {
            dependencyGraph[serviceName] = [].concat(nameNServiceMap[serviceName].dependencies);
        }
        retVal += JSON.stringify(dependencyGraph, null, 2);
        //return
        return retVal;
    };

    //--------------------------------------------------------------------------
    //  Utils

    function scanPaths(paths) {
        return new Promise(function (resolve, reject) {
            var scanner = new AnnotationScanner(logger);
            scanner
                .scan(paths)
                .then(function () {
                    var filePaths = scanner.getFilesByAnnotation("Service");
                    //load file:
                    filePaths.forEach(function (filePath) {
                        var serviceAnnotation = scanner.getAnnotation(filePath, "Service");
                        loadService(serviceAnnotation, filePath);
                    });
                    resolve();
                })
                .catch(reject);
        });
    }

    function watchAndScanArgumentsToPaths(wsArguments) {
        var retVal = [];
        for (var idx in wsArguments) {
            var arg = wsArguments[idx];
            if (arg instanceof Array) {
                retVal = retVal.concat(arg);
            } else if (typeof arg == "string") {
                retVal.push(arg);
            }
        }
        //return
        return retVal;
    }

    function getDependents(serviceName) {
        return _.chain(nameNServiceMap)
            .keys()
            .filter(function (key) {
                return nameNServiceMap[key].dependencies.indexOf(serviceName) >= 0;
            })
            .value();
    }

    function resolveService(serviceName, missingResolver) {
        var retVal = null;
        var service = nameNServiceMap[serviceName];
        if (service != null && !service.invalidated) {
            retVal = service.service;
        } else if (service == null && missingResolver != null) {
            retVal = resolveMissing(missingResolver, serviceName);
        }
        //return
        return retVal;
    }

    function tryConstructInvalidatedServices() {
        while (true) {
            var invalidatedServicesCount = _.chain(nameNServiceMap)
                .keys()
                .filter(function (key) {
                    return nameNServiceMap[key].invalidated;
                })
                .value()
                .length;

            for (var invalidatedServiceName in nameNServiceMap) {
                var service = nameNServiceMap[invalidatedServiceName];
                if (service.invalidated && tryRegisterServiceByConstructor(invalidatedServiceName, service.serviceConstructor)) {
                    logger.log("Flush service " + invalidatedServiceName + " successfully");
                }
            }
            var newInvalidatedServicesCount = _.chain(nameNServiceMap)
                .keys()
                .filter(function (key) {
                    return nameNServiceMap[key].invalidated;
                })
                .value()
                .length;
            if (newInvalidatedServicesCount == invalidatedServicesCount) {
                break;
            }
        }
    }

    function getArguments(fx, missingResolver) {
        var parameters = Fx.extractParameters(fx);
        return self.resolve(parameters, missingResolver);
    }

    /**
     * 
     * @param {type} fx
     * @param {type} args
     * @returns {undefined}
     */
    function checkNotNullArguments(fx, args) {
        var nullIdx = _(args).findIndex(function (arg) {
            return arg == null;
        });
        if (nullIdx >= 0) {
            var parameters = Fx.extractParameters(fx);

            var availableServices = _.chain(nameNServiceMap).keys().filter(function (key) {
                return !nameNServiceMap[key].invalidated;
            }).join(", ");

            var message = "Found null parameter '" + parameters[nullIdx]
                + "' in list of parameter(s): [" + parameters.join(", ") + "].\n"
                + "Available service(s): [" + availableServices + "]";
            throw new Error(message);
        }
    }

    function tryRegisterServiceByConstructor(name, serviceConstructor) {
        var retVal = false;
        var arguments = getArguments(serviceConstructor);
        try {
            checkNotNullArguments(serviceConstructor, arguments);
            nameNServiceMap[name].service = self.construct(serviceConstructor);
            nameNServiceMap[name].invalidated = false;
            retVal = true;
        } catch (error) {
        }
        return retVal;
    }

    function resolveMissing(missingResolver, serviceName) {
        if (typeof missingResolver === "function") {
            return missingResolver(serviceName);
        } else if (typeof missingResolver === "object") {
            return missingResolver[serviceName];
        } else {
            throw new Error("Invalid type of missintResolver: " + (typeof missingResolver));
        }
    }

    /**
     * Invalidate all related service and detect dependency cycle
     * 
     * @param {type} serviceName
     * @returns {undefined}
     */
    function invalidateDependencies(serviceName) {
        var traversor = new Traversor(serviceName);
        while (!traversor.isFinished()) {
            var current = traversor.next();
            if (current != null) {
                current.invalidated = true;
            }
        }
    }

    function tryLoadServiceFile(filePath) {
        var scanner = new AnnotationScanner(logger);
        scanner
            .scan([filePath])
            .then(function () {
                var filePaths = scanner.getFilesByAnnotation("Service");
                if (filePaths.length != 1) {
                    return;
                }
                //ELSE:
                var serviceAnnotation = scanner.getAnnotation(filePath, "Service");
                loadService(serviceAnnotation, filePath);
            });
    }

    function loadService(serviceAnnotation, filePath) {
        var serviceName = serviceAnnotation.parameters["name"];
        var oldFilePath = getFilePathByServiceName(serviceName);
        if (oldFilePath != null && oldFilePath != filePath) {
            logger.log("Duplicated service name \"" + serviceName + "\" in files \"" + filePath
                + "\" and \"" + oldFilePath + "\"");
            return;
        }
        //ELSE:
        try {
            var stdFilePath = path.join(rootPath, filePath);
            delete require.cache[require.resolve(stdFilePath)];
            var serviceConstructor = require(stdFilePath);
            self.registerByConstructor(serviceName, serviceConstructor);

            linkFilePathAndServiceName(filePath, serviceName);
        } catch (error) {
            logger.log("Couldn't load service in file: " + filePath, error);
        }
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

    function getFilePathByServiceName(serviceName) {
        return serviceNameNFilePathMap[serviceName];
    }

    function getServiceNameByFilePath(filePath) {
        return filePathNServiceNameMap[filePath];
    }

    //--------------------------------------------------------------------------
    //  Initialization

    //Default services
    self.register("$construct", self.construct);
    self.register("$invoke", self.invoke);
    self.register("$register", self.register);
    self.register("$registerByConstructor", self.registerByConstructor);
    self.register("$resolve", self.resolve);

    //--------------------------------------------------------------------------
    //  Inner class
    function Traversor(start, viaDependencies) {
        var path = [];
        var queue = [];
        queue.push(start);

        this.next = function () {
            var retVal = null;
            while (retVal == null && queue.length > 0) {
                var vertex = queue.pop();
                if (path.indexOf(vertex) == -1) {
                    retVal = vertex;
                }
            }
            if (retVal == null) {
                return retVal;
            }
            //ELSE:
            path.push(retVal);
            var service = nameNServiceMap[retVal];
            if (service != null) {
                var vertices = viaDependencies ? service.dependencies : getDependents(retVal);
                vertices.forEach(function (vertex) {
                    if (vertex == start) {
                        var cycle = path.slice(0);
                        cycle.push(vertex);
                        if (!viaDependencies) {
                            cycle.reverse();
                        }
                        /*
                        console.log("---");
                        console.log(self.toString());
                        console.log("---");
                        console.log("Start from serviceName: " + start);
                        console.log("Path: " + path.join(","));
                        */
                        throw new Error("Detect a dependency cycle: " + cycle.join(" --> "));
                    }
                    //ELSE:
                    queue.push(vertex);
                });
            }
            //return
            return retVal;
        };

        this.isFinished = function () {
            return queue.length == 0;
        };
    }

}