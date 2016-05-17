/**
 * Copyright (C) 2015, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * Jul 23, 2015 11:23:11 PM
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

describe("buncha scans 100 service files", function () {

    it("should scan all services quickly", function (done) {

        this.timeout(3000);

        var numberOfGeneratedServices = 100;
        helper.emptyGeneratedDirectory()
            .then(function () {
                helper.generateAndWriteServicesToFiles(numberOfGeneratedServices)
                    .then(function () {
                        return new Promise(function (resolve, reject) {
                            var container = new Container({debug: true});
                            var startTime = (new Date()).getTime();
                            container
                                .scan(["test/annotation-samples", "test/annotation-samples/generated-services"])
                                .then(function () {
                                    var endTime = (new Date()).getTime();
                                    console.log("Buncha took " + (endTime - startTime) + "ms to scan " + numberOfGeneratedServices + " services");
                                    for (var idx = 0; idx < numberOfGeneratedServices; idx++) {
                                        var service = container.resolve("service" + idx);
                                        expect(service).to.not.equal(null);
                                    }
                                    resolve();
                                })
                                .catch(reject);
                        });
                    })
                    .then(function () {
                        return helper.emptyGeneratedDirectory();
                    })
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });

    });
});