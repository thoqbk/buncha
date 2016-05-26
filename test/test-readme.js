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

describe("test readme: all samples in readme page should work fine", function () {
    it("Register services manually", function () {
        //Declare services 
        var userService = function () {
            //... 
        }
        var ReportService = function (userService) {
            //... 
        }
        //Register services. The registration order is NOT important 
        var container = new (require("../index.js").Container)();
        container.registerByConstructor("reportService", ReportService);
        container.register("userService", userService);

        //Get service by name 
        var reportService = container.resolve("reportService");
        var services = container.resolve(["reportService", "userService"]);

        expect(reportService).to.not.equal(null);
        expect(services.length).to.equal(2);
    });

    it("Invoke function and construct an object", function () {

        //Declare services 
        var userService = function () {
            //... 
        }
        var ReportService = function (userService) {
            //... 
        }
        //Register services. The registration order is NOT important 
        var container = new (require("../index.js").Container)();
        container.registerByConstructor("reportService", ReportService);
        container.register("userService", userService);


        function generateReport(userService, reportService) {
            //... 
        }

        function Report(reportService, userService, type) {
            //... 
        }

        //Buncha finds correct arguments to invoke the function 
        var report1 = container.invoke(generateReport);

        //Add missingResolver {type:"pdf"} 
        //Missingresolver can be a function(parameterName){} 
        var report2 = container.construct(Report, {type: "pdf"});

        expect(report1).to.equal(undefined);
        expect(report2).to.not.equal(null);
    });

    it("Function utility", function () {
        function hello(name, age) {
            //... 
        }
        var User = function (name, age) {
            this.getName = function () {
                return name;
            }
            this.getAge = function () {
                return age;
            }
        }
        var user = new User("Tom", 10);

        var Fx = require("../index.js").Fx;
        var parameters = Fx.extractParameters(hello); //return ["name", "age"] 
        var methods = Fx.getMethodNames( user ); //return ["getName", "getAge"]
        
        
        assert.include(parameters,"name");
        assert.include(parameters,"age");
        
        assert.include(methods,"getName");
        assert.include(methods,"getAge");

    });

});