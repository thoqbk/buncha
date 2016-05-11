/**
 * Copyright (C) 2015, Cloudchat
 *
 * Tho Q Luong <thoqbk@gmail.com>
 *
 * Aug 06, 2015 21:43:22 PM
 * @Service(name="userService")
 */

var Promise = require("bluebird");

/**
 * @Service(name="userService")
 */
module.exports = UserService;

var users = [{
        id: 1,
        username: "cloudpify",
        fullName: "Cloudpify",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 23,
        username: "thoqbk",
        fullName: "Luong Quy Tho",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 64,
        username: "hiencolla",
        fullName: "HienColla",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 66,
        username: "honghanh",
        fullName: "Hồng Hạnh",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 67,
        username: "phanhao",
        fullName: "Phan Hảo",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 68,
        username: "tiendung",
        fullName: "Tiến Dũng",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 69,
        username: "tranphuong",
        fullName: "Trần Phương",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 71,
        username: "thanhtam",
        fullName: "Thanh Tâm",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 72,
        username: "thuthao",
        fullName: "Thu Thảo",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }, {
        id: 220,
        username: "linhnana",
        fullName: "Linhnana",
        onlineStatus: "offline",
        avatarPath: "/image/avatar.png"
    }];

function UserService() {
    this.get = function (id) {
        return new Promise(function (resolve) {
            var tempUsers = users.filter(function (tempUser) {
                return tempUser.id == id;
            });
            resolve(tempUsers.length == 1 ? tempUsers[0] : null);
        });
    };
}
