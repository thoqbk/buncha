/**
 * Test helper
 */

var Fx = require("../lib/fx.js");

var _ = require("underscore");

var fs = require("fs");

var path = require("path");

var Promise = require("bluebird");

module.exports.generateAndWriteServicesToFiles = generateAndWriteServicesToFiles;

module.exports.emptyGeneratedDirectory = function () {
    var rootPath = "test/annotation-samples/generated-services";
    var allJsFilesPromise = new Promise(function (resolve, reject) {
        fs.readdir(rootPath, function (error, items) {
            if (error != null) {
                reject(error);
            } else {
                var jsFiles = _(items).filter(function (item) {
                    return path.extname(item) == ".js";
                });
                resolve(jsFiles);
            }
        });
    });

    return new Promise(function (resolve, reject) {
        allJsFilesPromise
            .then(function (jsFiles) {
                var promises = [];
                jsFiles.forEach(function (jsFile) {
                    var deleteFilePromise = new Promise(function (resolve, reject) {
                        fs.unlink(path.join(rootPath, jsFile), function (error) {
                            if (error != null) {
                                reject(error);
                            } else {
                                resolve();
                            }
                        });
                    });
                    promises.push(deleteFilePromise);
                });
                return Promise.all(promises);
            })
            .then(resolve)
            .catch(reject);
    });
};

function generateAndWriteServicesToFiles(servicesCount) {
    if (servicesCount == null) {
        servicesCount = 100;
    }

    var rootPath = "test/annotation-samples/generated-services";

    var sampleServices = generateSampleServices(servicesCount);
    var promises = [];

    sampleServices.forEach(function (sampleService) {
        var promise = new Promise(function (resolve, reject) {
            var fileName = sampleService.name + ".js";
            var filePath = path.join(rootPath, fileName);
            var functionBody = sampleService.functionBody;
            //write to file
            fs.writeFile(filePath, functionBody, function (error) {
                if (error != null) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
        promises.push(promise);
    });
    //return
    return Promise.all(promises);
}

function generateSampleServices(servicesCount) {
    var retVal = []; //list of {name, functionBody}
    if (servicesCount == null) {
        servicesCount = 100;
    }
    var serviceBodies = generateSampleServiceBodies(servicesCount);
    var numberOfServiceLevels = 5;//0 --> 4
    var minNumberOfDependencies = 3;
    var maxNumberOfDependencies = 10;

    for (var idx = 0; idx < servicesCount; idx++) {
        var serviceBody = serviceBodies[idx];
        var currentServiceLevel = 5 - Math.floor(idx / (servicesCount / numberOfServiceLevels)) - 1;

        console.log("Current service level: " + currentServiceLevel);

        var annotationPart = "/**\n"
            + "* @Service(name=\"service" + idx + "\")\n"
            + "**/\n";
        var exportPart = "module.exports = Service" + idx + ";\n";
        var functionBodyPart = "function Service" + idx + "("
            + buildParameterPart(minNumberOfDependencies, maxNumberOfDependencies,
                numberOfServiceLevels, currentServiceLevel, servicesCount)
            + ") {\n"
            + serviceBody
            + "};";
        retVal.push({
            name: "service" + idx,
            functionBody: annotationPart + exportPart + functionBodyPart
        });
    }

    return retVal;
}

/**
 * Sample return value: "service1, service9, service21"
 * 
 * @param {type} minNumberOfDependencies
 * @param {type} maxNumberOfDependencies
 * @param {type} numberOfServiceLevels
 * @param {type} currentServiceLevel
 * @param {type} servicesCount
 * @returns {String|buildParameterPart.retVal}
 */
function buildParameterPart(minNumberOfDependencies, maxNumberOfDependencies,
    numberOfServiceLevels, currentServiceLevel, servicesCount) {
    var retVal = "";
    if (currentServiceLevel == numberOfServiceLevels - 1) {
        return retVal;
    }
    //ELSE:
    var rangeStop = Math.floor(servicesCount / numberOfServiceLevels) * (numberOfServiceLevels - currentServiceLevel - 1) - 1;

    console.log("Range stop: " + rangeStop + "; level: " + currentServiceLevel);

    var range = _.range(0, rangeStop);
    var numberOfDependencies = _.random(minNumberOfDependencies, maxNumberOfDependencies);
    var serviceIds = _(range).sample(numberOfDependencies);
    serviceIds.forEach(function (serviceId) {
        if (retVal.length > 0) {
            retVal += ", ";
        }
        retVal += "service" + serviceId;
    });
    //return
    return retVal;
}


function generateSampleServiceBodies(servicesCount) {
    if (servicesCount == null) {
        servicesCount == 100;
    }
    var minNumberOfMethods = 1;
    var maxNumberOfMethods = 5;
    var retVal = [];
    var sampleFunctions = getSampleFunctions();

    for (var idx = 0; idx < servicesCount; idx++) {
        var serviceBody = "";
        var numberOfMethods = _.random(minNumberOfMethods, maxNumberOfMethods);
        var methods = _(sampleFunctions).sample(numberOfMethods);
        methods.forEach(function (method) {
            serviceBody += "this." + method.name + " = " + method.fxInString + ";";
            serviceBody += "\n";
        });
        retVal.push(serviceBody);
    }
    //return
    return retVal;
}

function getSampleFunctions() {
    var libs = [require("path"), require("chai").expect,
        require("chai").assert, require("../lib/fx.js"),
        require("underscore")];
    var retVal = [];//list of {name, fxInString}
    libs.forEach(function (lib) {
        var methodNames = Fx.getMethodNames(lib);
        methodNames.forEach(function (methodName) {
            var fxInString = lib[methodName].toString();
            if (fxInString.indexOf("[native code]") == -1) {
                retVal.push({
                    name: methodName,
                    fxInString: fxInString
                });
            }
        });
    });
    console.log("Created " + retVal.length + " sample functions");
    //return
    return retVal;
}
