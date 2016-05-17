/**
 * Copyright (C) 2016, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * May 6, 2016
 * 
 */

var expect = require("chai").expect;
var assert = require("chai").assert;


var chai = require("chai");
chai.use(require('chai-fuzzy'));

var Promise = require("bluebird");

var AnnotationScanner = require("../lib/annotation-scanner.js");

var Logger = require("../lib/logger.js");

var Container = require("../lib/container.js");

describe("test annotation scanner", function () {
    it("should scan all controllers and services", function (done) {
        var scanner = new AnnotationScanner(new Logger(true));
        scanner.scan(["test/annotation-samples"])
            .then(function () {
                var controllerFiles = scanner.getFilesByAnnotation("Controller");
                expect(controllerFiles).to.include("test/annotation-samples/sample-controller.js");
                expect(controllerFiles).to.include("test/annotation-samples/sample-controller2.js");
                expect(controllerFiles).to.include("test/annotation-samples/investment/portfolio-controller.js");
                done();
            })
            .catch(done);
    });
});
