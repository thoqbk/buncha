/**
 * Copyright (C) 2015, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * May 25, 2016 11:23:11 PM
 * 
 */


var chai = require("chai");
chai.use(require('chai-fuzzy'));

var expect = chai.expect;
var assert = chai.assert;



var Fx = require("../lib/fx.js");

var _ = require("underscore");

var helper = require("./helper.js");

var Container = require("../lib/container.js");

var WatchHelper = require("./watch-helper.js");

describe("test watch", function () {

    it("watch step by step", function (done) {
        this.timeout(60000);
        var container = new Container({debug: true, scannedAnnotations: ["Service", "Controller"]});
        //1. write service1.v0
        WatchHelper.writeFile("service1-v0.txt", "service1.js")
            .then(function () {
                //2. write service2
                return WatchHelper.writeFile("service2.txt", "service2.js");
            })
            .then(function () {
                //3. start watch and check 2 services
                return container.watch("test/watch/service");
            })
            .delay(5000)
            .then(function () {
                expect(container.resolve("service1")).to.not.equal(null);
                expect(container.resolve("service2")).to.not.equal(null);
            })
            .then(function () {
                //4. service1 --> v1: service1: error
                return WatchHelper.writeFile("service1-v1.txt", "service1.js");
            })
            .delay(10000)
            .then(function () {
                expect(container.resolve("service2")).to.equal(null);
                expect(container.resolve("service1")).to.equal(null);
            })
            .then(function () {
                //5. service1 --> v2: correct service1
                return WatchHelper.writeFile("service1-v2.txt", "service1.js");
            })
            .delay(10000)
            .then(function () {
                var service1 = container.resolve("service1");
                expect(service1).to.not.equal(null);
                expect(container.resolve("service2")).to.not.equal(null);
                expect(service1.hello()).to.equal("Hello Vietnam");
            })
            .then(function () {
                //6. service1 --> v3
                return WatchHelper.writeFile("service1-v3.txt", "service1.js");
            })
            .delay(10000)
            .then(function () {
                expect(container.resolve("service1")).to.equal(null);
                expect(container.resolve("service2")).to.equal(null);
                expect(container.resolve("controller1")).to.not.equal(null);
            })
            .then(function () {
                //7. Delete service1.js
                return WatchHelper.deleteFile("service1.js");
            })
            .delay(5000)
            .then(function () {
                expect(container.resolve("controller1")).to.equal(null);
                container.close();
                WatchHelper.deleteFile("service2.js");
            })
            .delay(5000)
            .then(function () {
                done();
            })
            .catch(function (error) {
                done(error);
            });
    });
});
