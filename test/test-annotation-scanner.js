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

var _ = require("underscore")

var Container = require("../lib/container.js");

var Logger = require("../lib/logger.js");

var Container = require("../lib/container.js");

describe("test annotation scanner", function () {
    it("should scan all controllers and services", function (done) {
        var container = new Container({debug: true, scannedAnnotations: ["Service", "Controller"]});
        container.register("$logger", {log: function () {}});
        container.scan(["test/annotation-samples"])
            .then(function () {

                var sampleController = container.resolve("SampleController");
                var sampleController2 = container.resolve("SampleController2");
                var portfolioController = container.resolve("investment.PortfolioController");

                var userService222 = container.resolve("userService222");
                var userService = container.resolve("userService");


                expect(sampleController).to.not.equal(null);
                expect(sampleController2).to.not.equal(null);
                expect(portfolioController).to.not.equal(null);

                var services = container.resolveByAnnotation("Service");
                assert.include(_(services).values(), userService222);
                assert.include(_(services).values(), userService);


                var controllers = container.resolveByAnnotation("Controller");
                assert.include(_(controllers).values(), sampleController);
                assert.include(_(controllers).values(), sampleController2);
                assert.include(_(controllers).values(), portfolioController);

                done();
            })
            .catch(done);
    });
});
