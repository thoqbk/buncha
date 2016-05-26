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

var Container = require("../lib/container.js");

var Logger = require("../lib/logger.js");

var Container = require("../lib/container.js");

describe("test annotation scanner", function () {
    it("should scan all controllers and services", function (done) {
        var container = new Container({debug: true, scannedAnnotations: ["Service", "Controller"]});
        container.register("$logger", {log: function () {}});
        container.scan(["test/annotation-samples"])
            .then(function () {

                expect(container.resolve("SampleController")).to.not.equal(null);
                expect(container.resolve("SampleController2")).to.not.equal(null);
                expect(container.resolve("investment.PortfolioController")).to.not.equal(null);

                done();
            })
            .catch(done);
    });
});
