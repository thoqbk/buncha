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

describe("IoC container (cont)", function () {
    //1. dependency cycle
    it("should detect the dependency cycle. Round 1", function () {

        var container = new Container();
        container.registerByConstructor("service1", function (service2) {});
        try {
            container.registerByConstructor("service2", function (service1) {});
            assert.ok(false, "Expect container detects dependency cycle");
        } catch (error) {
            var errorMessage = error.toString();
            expect(errorMessage).to.contain("service2 --> service1 --> service2");
        }
    });

    it("should detect the dependency cycle. Round 2", function () {
        var container = new Container();
        container.registerByConstructor("service2", function (service3) {});
        container.registerByConstructor("service1", function (service2) {});
        try {
            container.registerByConstructor("service3", function (service1) {});
            assert.ok(false, "Expect container detects dependency cycle");
        } catch (error) {
            var errorMessage = error.toString();
            expect(errorMessage).to.contain("service3 --> service1 --> service2 --> service3");
        }
    });


    it("should detect the dependency cycle. Round 3", function () {
        var container = new Container();
        container.registerByConstructor("service1", function (service2, service3) {});
        container.registerByConstructor("service2", function (service3, service4) {});
        container.registerByConstructor("service3", function (service4, service5) {});
        container.registerByConstructor("service4", function () {});
        try {
            container.registerByConstructor("service5", function (service1) {});
            assert.ok(false, "Expect container detects dependency cycle");
        } catch (error) {
            var errorMessage = error.toString();
            expect(errorMessage).to.contain("service5 --> service1 --> service2 --> service3 --> service5");
        }
    });

    it("should not detect a dependency cycle. Round 4", function () {
        var container = new Container();
        container.registerByConstructor("service10", function (service2, service3, service4, service5) {});
        container.registerByConstructor("service11", function (service3, service4, service6) {});
        container.registerByConstructor("service20", function (service10) {});
        container.registerByConstructor("service21", function (service11, service10) {});
        container.registerByConstructor("service30", function (service21, service20) {});
    });

    it("should not detect a dependency cycle. Round 5", function () {
        var container = new Container();
        container.registerByConstructor("service5", function () {});
        container.registerByConstructor("service38", function (service5) {});
        container.registerByConstructor("service40", function (service5) {});
        container.registerByConstructor("service45", function (service5) {});
        container.registerByConstructor("service48", function (service5, service38) {});
    });

    it("should not detect a dependency cycle. Round 6", function () {
        try {
            var container = new Container();
            container.registerByConstructor("service2", function (service1) {});
            container.registerByConstructor("service1", function (service5) {});
            container.registerByConstructor("service5", function (service6) {});
            container.registerByConstructor("service6", function (service3, service4) {});
            container.registerByConstructor("service3", function (service1, service4) {});
        } catch (error) {
            var errorMessage = error.toString();
            expect(errorMessage).to.contain("service3 --> service1 --> service5 --> service6 --> service3");
        }
    });

});