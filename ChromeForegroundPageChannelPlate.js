// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function foregroundChannelPlate(global) {

	"use strict";
	var DEBUG = false;

	if (!global.ChannelPlate)
	  throw new Error("require ChannelPlate");

	//-----------------------------------------------------------------------------
	// For foreground pages to contact background pages.
	// Note  the name argument on each content script must be unique

	function ContentScriptChannelPlate(myName, onMessage) {
	  this.port = chrome.extension.connect({name: myName});
	  function onDisconnect(event){
	    console.log("ChromeClientPort onDisconnect ", event);
	     delete this.port;
	  }
	  this.port.onDisconnect.addListener(onDisconnect.bind(this));
	  this.port.onMessage.addListener(onMessage);
	}

	ContentScriptChannelPlate.prototype = Object.create(Base.prototype);


	function DevtoolsChannelPlate(onMessage) {
	  var name = encodeURIComponent(window.location.href).replace(/[!'()*]/g, '_');
	  ContentScriptChannelPlate.call(this, name, onMessage);
	}

	DevtoolsChannelPlate.prototype = Object.create(ContentScriptChannelPlate.prototype);

	ChannelPlate.ContentScriptChannelPlate = ContentScriptChannelPlate;
	ChannelPlate.DevtoolsChannelPlate = DevtoolsChannelPlate;

}(this));
