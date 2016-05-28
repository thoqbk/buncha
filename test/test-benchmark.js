/**
 * Copyright (C) 2016, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * May 10, 2016
 * 
 */

var chai = require("chai");
chai.use(require('chai-fuzzy'));

var expect = require("chai").expect;
var assert = require("chai").assert;

var _ = require("underscore");

var Container = require("../lib/container.js");

describe("Benchmark", function () {

    var totalTimes = 1000000;

    var container = null;

    var service1 = function (n1, n2) {
        return n1 * n2;
    };

    beforeEach(function () {
        container = new Container();
        container.register("service1", service1);
    });

    afterEach(function () {
        container.close();
        container = null;
    });

    it("Benchmark. Round 1: invoke", function () {
        this.timeout(60000);
        console.log("------------------------------");
        console.log("Benchmark result of $invoke:");
        var fx = function (service1) {
            var n1 = Math.floor(Math.random() * 1000000);
            var n2 = Math.floor(Math.random() * 1000000);
            return service1(n1, n2);
        };
        //1. Invoke without container
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            fx(service1);
        }
        var stop1 = stop();
        console.log("Wo Container: It takes " + stop1 + "ms to invoke " + totalTimes + " times.");
        //2. Invoke with container without caching
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            container.invoke(function (service1) {
                var n1 = Math.floor(Math.random() * 1000000);
                var n2 = Math.floor(Math.random() * 1000000);
                return service1(n1, n2);
            });
        }
        var stop2 = stop();
        console.log("W/ Container, Wo Caching: It takes " + stop2 + "ms to invoke " + totalTimes + " times. Average time spent by Buncha: " + (stop2 - stop1) / totalTimes + "ms");
        //3. Invoke with container with caching
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            container.invoke(fx);
        }
        var stop3 = stop();
        console.log("W/ Container, With Caching: It takes " + stop3 + "ms to invoke " + totalTimes + " times. Average time spent by Buncha: " + (stop3 - stop1) / totalTimes + "ms");
        console.log("------------------------------");
    });

    it("Benchmark. Round 2: construct", function () {
        this.timeout(60000);
        console.log("------------------------------");
        console.log("Benchmark result of $construct:");
        var Report = function (service1) {
            var n1 = Math.floor(Math.random() * 1000000);
            var n2 = Math.floor(Math.random() * 1000000);
            service1(n1, n2);
        };
        //1. Construct without container
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            new Report(service1);
        }
        var stop1 = stop();
        console.log("Wo Container: It takes " + stop1 + "ms to construct " + totalTimes + " times.");
        //2. Construct with container without caching
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            container.construct(function (service1) {
                var n1 = Math.floor(Math.random() * 1000000);
                var n2 = Math.floor(Math.random() * 1000000);
                service1(n1, n2);
            });
        }
        var stop2 = stop();
        console.log("W/ Container, Wo Caching: It takes " + stop2 + "ms to construct " + totalTimes + " times. Average time spent by Buncha: " + (stop2 - stop1) / totalTimes + "ms");
        //3. Construct with container with caching
        start();
        for (var idx = 0; idx < totalTimes; idx++) {
            container.invoke(Report);
        }
        var stop3 = stop();
        console.log("W/ Container, With Caching: It takes " + stop3 + "ms to construct " + totalTimes + " times. Average time spent by Buncha: " + (stop3 - stop1) / totalTimes + "ms");
        console.log("------------------------------");
    });
});

var startTime = null;

function start() {
    if (startTime != null) {
        throw new Error("Stop the timer first");
    }
    startTime = (new Date()).getTime();
}
;

function stop() {
    var retVal = (new Date()).getTime() - startTime;
    startTime = null;
    return retVal;
}
;


