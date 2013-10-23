// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

importScripts("../ChannelPlate.js");
importScripts("../worker.js");

var debug = true;

ChannelPlate.worker.parent.connect(function onConnect(messagePort) {
	messagePort.onMessage.addListener(function onMessage(message) {
		// Low-level incoming API implements test
  		if (message === "hello child") {
    		console.log("PASS: child hears " + message)
  		} else {
    		console.log('FAIL: '+ location + ' heard ' + message);
  		}
	});
	// Low-level outgoing test
	messagePort.postMessage("mommy?");
});

if (debug) {
  console.log("child listening for parent");
}
