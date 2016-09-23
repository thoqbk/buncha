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

    var logger = new (require("../lib/logger.js"))(config != null && config.debug);

    var scannedAnnotations = ["Service"];
    if (config != null && config.scannedAnnotations != null) {
        scannedAnnotations = config.scannedAnnotations;
    }

    var scanner = null;

    var EventEmitter = require("events");

    var events = new EventEmitter();
    //--------------------------------------------------------------------------
    //  Method bindings

    this.construct = function (constructor, missingResolver) {
        var args = getArguments(constructor, missingResolver);
        checkNotNullArguments(constructor, args);
        return new (constructor.bind.apply(constructor, [null].concat(args)))();
    };

    this.invoke = function () {
        var fx = null;
        var thisContext = null;
        var missingResolver = null;
        if (arguments.length == 2) {
            fx = arguments[0];
            missingResolver = arguments[1];
        } else if (arguments.length == 3) {
            fx = arguments[0];
            thisContext = arguments[1];
            missingResolver = arguments[2];
        } else if (arguments.length == 1) {
            fx = arguments[0];
        } else {
            throw new Error("Passing invalid parameters in invoke function");
        }
        var args = getArguments(fx, missingResolver);
        checkNotNullArguments(fx, args);
        return fx.apply(thisContext, args);
    };

    this.register = function (serviceName, service) {
        serviceMustNotExist(serviceName);
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
        //Fire event:
        events.emit("+service", serviceName);
    };

    this.registerByConstructor = function (serviceName, constructor) {
        serviceMustNotExist(serviceName);
        if (constructor == null) {
            throw new Error("Register null constructor for service " + serviceName);
        } else if (!Fx.isFunction(constructor)) {
            throw new Error("Register invalid constructor for service "
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
        //Fire event:
        if (self.resolve(serviceName) != null) {
            events.emit("+service", serviceName);
        }
    };

    this.unregister = function (serviceName) {
        if (self.resolve(serviceName) == null) {
            throw new Error("Service not found: \"" + serviceName + "\"");
        }
        invalidateDependencies(serviceName);
        delete nameNServiceMap[serviceName];
        events.emit("-service", serviceName);
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
     * Return map of {serviceName: service}
     * @param {type} annotation
     * @returns {Array|nm$_container.exports.resolveByAnnotation.retVal|nm$_container.Container.resolveByAnnotation.retVal}
     */
    this.resolveByAnnotation = function (annotation) {
        var retVal = {};
        var serviceNames = scanner.getServiceNamesByAnnotation(annotation);
        serviceNames.forEach(function (serviceName) {
            var service = self.resolve(serviceName);
            if (service != null) {
                retVal[serviceName] = service;
            }
        });
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
        return scanner.scan(paths);
    };

    /**
     * Scan and watch directories or files to load services
     * and reload them if the files are changed, deleted or added
     *
     * @returns {Promise}
     */
    this.watch = function () {
        var paths = watchAndScanArgumentsToPaths(arguments);
        return scanner.watch(paths);
    };

    this.on = function (event, fx) {
        events.on(event, fx);
    };

    this.close = function () {
        if (scanner != null) {
            scanner.close();
            scanner = null;
        }
        events.removeAllListeners();
        events = null;
        nameNServiceMap = null;
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

    function serviceMustNotExist(serviceName) {
        if (self.resolve(serviceName) != null) {
            throw new Error("Service \"" + serviceName + "\" has already existed");
        }
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
        var args = getArguments(serviceConstructor);
        try {
            checkNotNullArguments(serviceConstructor, args);
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
     * Invalidate all related services and detect dependency cycle
     *
     * @param {type} serviceName
     * @returns {undefined}
     */
    function invalidateDependencies(serviceName) {
        var traversor = new Traversor(serviceName);
        while (!traversor.isFinished()) {
            var currentServiceName = traversor.next();
            if (currentServiceName != null && currentServiceName != serviceName) {
                var service = nameNServiceMap[currentServiceName];
                if (service != null) {
                    service.invalidated = true;
                    service.service = null;
                }
            }
        }
    }




    //--------------------------------------------------------------------------
    //  Initialization

    //Default services
    self.register("$construct", self.construct);
    self.register("$invoke", self.invoke);
    self.register("$register", self.register);
    self.register("$registerByConstructor", self.registerByConstructor);
    self.register("$unregister", self.unregister);
    self.register("$resolve", self.resolve);
    self.register("$resolveByAnnotation", self.resolveByAnnotation);

    scanner = this.construct(AnnotationScanner, {logger: logger, scannedAnnotations: scannedAnnotations});

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
                        throw new Error("Detect a dependency cycle: " + cycle.join(" --> "));
                    } else if (path.indexOf(vertex) == -1) {
                        queue.push(vertex);
                    }
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
