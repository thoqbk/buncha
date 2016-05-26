/**
 * Watch helper
 */

var fs = require("fs");

var path = require("path");

var rootPath = "test/watch";

var Promise = require("bluebird");


module.exports.writeFile = writeFile;
module.exports.deleteFile = deleteFile;

/**
 * Read content from source and write down to file destination
 * 
 * If destination does NOT exist, create new
 * 
 * @param {type} source
 * @param {type} destination
 * @returns {undefined}
 */
function writeFile(source, destination) {
    var sourcePath = path.join(rootPath, source);
    var destinationPath = path.join(rootPath, "service", destination);

    var readSourcePromise = new Promise(function (resolve, reject) {
        fs.readFile(sourcePath, "utf8", function (error, data) {
            if (error != null) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });

    return new Promise(function (resolve, reject) {
        readSourcePromise
            .then(function (content) {
                fs.writeFile(destinationPath, content, function (error) {
                    if (error != null) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
    });
}

function deleteFile(file) {
    return new Promise(function (resolve, reject) {
        fs.unlink(path.join(rootPath, "service", file), function (error) {
            if (error != null) {
                reject(error);
            } else {
                resolve();
            }
        });
    });

}

