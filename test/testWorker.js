// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

importScripts("../ChannelPlate.js");
importScripts("../WorkerChannelPlate.js");

var debug = false;

// Low-level incoming API implements test
//
function onMessage(message) {
  if (message.data === "hello child") {
    console.log("PASS: child hears")
  } else {
    console.log('FAIL: '+window.location + ' heard ' + message.data, message);
  }
}
console.log("ChannelPlate " + Object.keys(ChannelPlate).join(','));

var portToParent = new ChannelPlate.WorkerChannelPlate(onMessage);

if (debug) {
  console.log("child listening for parent");
}

// Low-level outgoing API continues test
//
portToParent.postMessage("mommy?");
