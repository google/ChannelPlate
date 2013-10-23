// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

importScripts("../ChannelPlate.js");
importScripts("../worker.js");

// Service we provide to web page
var serverTestMethods = {
    add: function(lhs, rhs, callback, errback) {
        callback(lhs + rhs);
    },
    div: function(lhs, rhs, callback, errback){
        if (rhs === 0) {
            errback("divide by zero");
        } else {
            callback(lhs/rhs);
        }
    },
    terminate: function(callback, errback) {
        callback();
        terminate();
    }
}

ChannelPlate.worker.parent.startServer(serverTestMethods, function(server) {
    console.log("server started");
});
