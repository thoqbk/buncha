/**
 * Copyright (C) 2016, Cloudpify
 * 
 * Tho Q Luong <thoqbk@gmail.com>
 * 
 * May 11, 2016
 * 
 */

module.exports = Logger;

function Logger(enable) {

    this.log = function (message, error) {
        if (enable === true) {
            var fullMessage = message + (error != null ? ". Error: " + error.stack : "");
            console.log(fullMessage);
        }
    };

}
