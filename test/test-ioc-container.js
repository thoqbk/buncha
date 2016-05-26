/**
 * Copyright (C) 2016, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * Feb 12, 2016
 * 
 */
var chai = require("chai");
chai.use(require('chai-fuzzy'));

var expect = require("chai").expect;
var assert = require("chai").assert;

var _ = require("underscore");

var Container = require("../lib/container.js");

var container = new Container();

describe("IoC container", function () {
    //1. register a service instance and test
    it("should register a service instance successfully", function () {
        var service1 = {
            hello: function () {
                return "service1.hello";
            }
        };
        container.register("service1", service1);
        expect(container.resolve("service1")).to.not.equal(null);
        expect(container.resolve("service1").hello()).to.equal("service1.hello");
    });
    //2. register a service class and test
    it("should register service by class and test successfully", function () {
        var Service2 = function () {
            this.hello2 = function () {
                return "service2.hello2";
            };
            this.hi2 = function () {
                return "service2.hi2";
            };
        };
        container.registerByConstructor("service2", Service2);
        expect(container.resolve("service2")).to.not.equal(null);
        expect(container.resolve("service2").hello2()).to.equal("service2.hello2");
        expect(container.resolve("service2").hi2()).to.equal("service2.hi2");
    });
    //3. register a service class but missing dependency and test
    var Service3 = function (service1, service2, service4) {
        this.hi3 = function () {
            return "service3.hi3";
        };
    };
    it("should be fail if register a service class but missing dependency for it", function () {
        container.registerByConstructor("service3", Service3);
        expect(container.resolve("service3")).to.equal(null);
    });
    //4. fix 3. by add missing dependency and attempt to flushLazyServiceClasses
    it("should flush lazy service-classes successfully when add missing service4", function () {
        var Service4 = function (service1, service2) {
            this.hi4 = function () {
                return "service4.hi4";
            };
        };
        container.registerByConstructor("service4", Service4);

        assert.instanceOf(container.resolve("service3"), Service3);
        assert.instanceOf(container.resolve("service4"), Service4);

        expect(container.resolve("service3").hi3()).to.equal("service3.hi3");
    });
    //5. try to build object from by passing a constructor
    it("should build an object sucessfully", function () {
        var Controller5 = function (service3, service1) {
            expect(service3.hi3()).to.equal("service3.hi3");
            expect(service1.hello()).to.equal("service1.hello");
        };

        var $construct = container.resolve("$construct");

        try {
            $construct(Controller5);
        } catch (e) {
            assert.ok(false, "Build Container5 fail, message: " + e);
        }

        var Controller51 = function (service5) {
            expect(service5.hello5()).to.equal("service5.hello5");
        };
        try {
            var service5 = {
                hello5: function () {
                    return "service5.hello5";
                }
            };
            $construct(Controller51, function (name) {
                if (name == "service5") {
                    return service5;
                }
            });
        } catch (e) {
            assert.ok(false, "Build Container51 with dependency resolver fail, message: " + e);
        }
    });

    //6. invoke method with missing resolver
    it("should invoke method with missing resolver correctly", function () {
        var f = function (service1, service6) {
            expect(service1.hello()).to.equal("service1.hello");
            expect(service6.hello6()).to.equal("service6.hello6");

            return "service6.hi6";
        };
        $invoke = container.resolve("$invoke");
        var service6 = {
            hello6: function () {
                return "service6.hello6";
            }
        };
        var message = $invoke(f, function (name) {
            if (name == "service6") {
                return service6;
            }
        });
        expect(message).to.equal("service6.hi6");
        $invoke(f, {"service6": service6});
    });

    //7. dependency graph
    it("should show correct dependency graph", function () {
        var containerDescription = container.toString()
            .replace("Dependency graph:", "");
        var dependencyGraph = JSON.parse(containerDescription);

        expect(dependencyGraph["service1"]).to.be.like([]);
        expect(dependencyGraph["service2"]).to.be.like([]);
        expect(dependencyGraph["service3"]).to.be.like(["service1", "service2", "service4"]);
        expect(dependencyGraph["service4"]).to.be.like(["service1", "service2"]);


        //console.log("Describe container: " + container.toString());
    });

    //8. invoke and construct
    it("should invoke and construct correctly", function () {
        var s1 = function () {
            return "s1";
        };
        var s2 = function () {
            return "s2";
        };
        var f = function (s1, s2) {
            return s1() + " + " + s2();
        };

        var fWithThis = function (s1, s2) {
            return s1() + " + " + s2() + this;
        };

        var c = function (s2, s1, s3) {
            this.message = s1() + " + " + s2() + " + " + s3();
        };

        var container = new Container();
        container.register("s1", s1);
        container.register("s2", s2);


        expect(container.invoke(f)).to.equal("s1 + s2");
        expect(container.invoke(fWithThis, " + s3", null)).to.equal("s1 + s2 + s3");

        expect(container.construct(c, {s3: function () {
                return "s3";
            }}).message).to.equal("s1 + s2 + s3");
    });

    //9. invalidate
    it("invalidate", function () {

        var container = new Container();

        var Service1 = function () {
            this.hello = function () {
                return "this is service1";
            };
        };

        var Service2 = function (service1) {
            this.hello = function () {
                return service1.hello() + " and service2";
            };
        };

        var Service1V2 = function (service3) {
            this.hello = function () {
                return "this is service1V2" + " and " + service3();
            };
        };


        var service3 = function () {
            return "service3";
        };

        //1. register service2, service1
        container.registerByConstructor("service2", Service2);
        expect(container.resolve("service2")).to.equal(null);
        container.registerByConstructor("service1", Service1);
        expect(container.resolve("service2")).to.not.equal(null);
        expect(container.resolve("service1")).to.not.equal(null);
        expect(container.resolve("service2").hello()).to.equal("this is service1 and service2");

        //2. unregister service 1 and expect service2 become invalidated
        container.unregister("service1");
        expect(container.resolve("service1")).to.equal(null);
        expect(container.resolve("service2")).to.equal(null);

        //3. register service2V2, service1 and check.
        container.registerByConstructor("service1", Service1V2);
        container.registerByConstructor("service2", Service2);
        expect(container.resolve("service1")).to.equal(null);
        expect(container.resolve("service2")).to.equal(null);

        //4. register service3 and check
        container.register("service3", service3);
        expect(container.resolve("service1")).to.not.equal(null);
        expect(container.resolve("service2")).to.not.equal(null);
        expect(container.resolve("service3")).to.not.equal(null);
        expect(container.resolve("service2").hello()).to.equal("this is service1V2 and service3 and service2");

        //5. unregister service3 and check
        container.unregister("service3");
        expect(container.resolve("service1")).to.equal(null);
        expect(container.resolve("service2")).to.equal(null);
    });
});



