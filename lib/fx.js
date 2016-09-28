/**
 * Copyright (C) 2015, Cloudpify
 *
 * Tho Q Luong <thoqbk@gmail.com>
 *
 * Aug 9, 2015 12:38:41 AM
 *
 */

var LRU = require("lru-cache");

var Fx = {};

module.exports = Fx;
//------------------------------------------------------------------------------
//  Members

var objectCache = LRU({//for caching method names of objects
    max: 500,
    length: function () {
        return 1;
    }
});

var fxCache = LRU({//for caching parameters of functions
    max: 500,
    length: function () {
        return 1;
    }
});

Fx.extractParameters = extractParameters;

Fx.getMethodNames = function (object) {
    var objectId = getOrSetFxId(object);

    var retVal = objectCache.get(objectId);
    if (retVal == null) {
        retVal = [];
        for (var propertyName in object) {
            if (typeof object[propertyName] === 'function') {
                retVal.push(propertyName);
            }
        }
        //cache
        objectCache.set(objectId, retVal);
    }
    //return
    return retVal;
};

Fx.extractAnnotations = extractAnnotations;

Fx.isFunction = function (fx) {
    return (typeof fx === "function");
};
//------------------------------------------------------------------------------
//  Utils

function removeSingeLineComments(fxString) {
    var singleLineCommentsPattern = /\/\/.*/g;
    return fxString.replace(singleLineCommentsPattern, "");
}

function removeMultiLineComments(fxString) {
    var multiLineCommentsPattern = /\/\*[\s\S]*?\*\//g;
    return fxString.replace(multiLineCommentsPattern, "");
}

function extractParameterPart(fxString) {
    var matches = fxString.match(/\(([\s\S]*?)\)/);
    return matches[1];
}

function extractParameters(fx) {
    var fxId = getOrSetFxId(fx);
    var retVal = fxCache.get(fxId);

    if (retVal == null) {
        retVal = [];
        var fxString = fx.toString();
        //remove all comments
        var woSingleLineComments = removeSingeLineComments(fxString);
        var woMultiLineComments = removeMultiLineComments(woSingleLineComments);
        var parameterPart = extractParameterPart(woMultiLineComments);
        var parameters = parameterPart.split(",");
        parameters.forEach(function (parameter) {
            var stdParameter = parameter.replace(/\s+/g, "");
            if (stdParameter.length > 0) {
                retVal.push(stdParameter);
            }
        });
        //cache
        fxCache.set(fxId, retVal);
    }
    //return
    return retVal;
}


var nextId = 1;
var idKey = "__buncha";

function getOrSetFxId(object) {
    var retVal = object[idKey];
    if (retVal == null) {
        retVal = nextId++;
        object[idKey] = retVal;
    }
    return retVal;
}

function extractAnnotations(scriptInString) {
    var retVal = [];

    var multiLineCommentsPattern = /\/\*[\s\S]*?\*\//g;

    var allMultiLineComments = multiLineCommentsPattern.exec(scriptInString);
    if(allMultiLineComments == null) {
      return retVal;
    }
    //ELSE:
    allMultiLineComments.forEach(function (multiLineComment) {
        var annotationPattern = /(\W+)\@(\w+)\s*(\((\s*\w+\s*\=\s*\"[^"]+\"\s*\,?)*\))?/g;
        while (true) {
            var annotationInStrings = annotationPattern.exec(multiLineComment);

            if (annotationInStrings == null) {
                break;
            }
            var enable = annotationInStrings[1].match(/\-\-\s*$/) == null;
            var annotationName = annotationInStrings[2];
            var parametersInString = annotationInStrings[3];
            var annotation = {
                name: annotationName,
                enable: enable,
                parameters: {}
            };
            retVal.push(annotation);
            if (parametersInString == null) {
                continue;
            }
            //ELSE:
            var parametersPattern = /(\w+)\s*\=\s*\"([^"]+)\"/g;
            while (true) {
                var parameterInStrings = parametersPattern.exec(parametersInString);
                if (parameterInStrings == null) {
                    break;
                }
                //ELSE:
                var key = parameterInStrings[1];
                var value = parameterInStrings[2];
                annotation.parameters[key] = value;
            }
        }
    });
    return retVal;
}
