// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function channelPlateConnectedIframe(global) {

	"use strict";
	var DEBUG = false;

	if (!global.ChannelPlate)
	  throw new Error("require ChannelPlate");

	//-----------------------------------------------------------------------------
	// For communicating from a window to an iframe child

	function ConnectedIframe(existingIframeElement, srcURLToAssign, onConnect) {
	  function filterOnConnect(rawPort, url) {
	    if (url.indexOf(srcURLToAssign) !== -1)
	      onConnect(rawPort, url);
	  }
	  ChannelPlate.PortServer(srcURLToAssign, filterOnConnect);
	  if (!existingIframeElement) {
	    throw new Error("First argument must be an existing iframe");
	  }
	  existingIframeElement.src = srcURLToAssign;
	}

	ChannelPlate.ConnectedIframe = ConnectedIframe;

}(this));