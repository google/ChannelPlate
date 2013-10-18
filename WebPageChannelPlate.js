// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function webPageChannelPlate(global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

//-----------------------------------------------------------------------------
//  For communicating from a web page to its content window

  function WebPageChannelPlate(onMessage) {
    ChannelPlate.PortClient.call(this, window, onMessage);
  }

  WebPageChannelPlate.prototype = Object.create(ChannelPlate.PortClient.prototype);

  ChannelPlate.WebPageChannelPlate = WebPageChannelPlate;

}(this));
