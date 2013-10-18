// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

importScripts("../ChannelPlate.js");
importScripts("../WorkerChannelPlate.js");
importScripts("../RemoteMethodCall.js");


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
        testServerWorker();
    }
}

var rawPort = new ChannelPlate.WorkerChannelPlate(function onMessage(){
	console.error("Should not be called");
});

new RemoteMethodCall.Responder(serverTestMethods, rawPort);