// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

// ChannelPlate:  a switchplate, covering over API differences in MessageChannel APIs.
//  Pass your onMessage handler to the constructor,
//  send your messages via method postMessage(message)

(function childIframeChannelPlate(global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

  //-----------------------------------------------------------------------------
  //  For communicating from an iframe to its window.parent

  function ChildIframeChannelPlate(onMessage) {
    ChannelPlate.PortClient.call(this, window.parent, onMessage);
  }

  ChildIframeChannelPlate.prototype = Object.create(ChannelPlate.PortClient.prototype);

  ChannelPlate.ChildIframeChannelPlate = ChildIframeChannelPlate;


}(this));
