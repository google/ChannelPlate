// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function (global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

  //-----------------------------------------------------------------------------
  // For background pages listening for foreground connections
  // Create a new getServerPort port for each foreground contact

  function ConnectedChromeBackgroundPage(onConnect) {

    var onRawConnect = function(rawPort) {
      if (DEBUG) {
        console.log("onConnect ", rawPort)
      }
      if (DEBUG) {
        console.log(window.location + " accept "+ rawPort.name);
      }

      onConnect(rawPort);

      rawPort.onDisconnect.addListener(function() {
        if (DEBUG) {
          console.log("onDisconnect " + rawPort.name);
        }
      }.bind(this));
    }.bind(this);

    chrome.extension.onConnect.addListener(onConnect);

  };


//-----------------------------------------------------------------------------
// Common functions for proxies

var ProxyBasePrototype = {

  addPort: function(port, connectionId, incomingPorts, outgoingPorts) {
    var onMessage = this.proxyMessage.bind(this, connectionId, outgoingPorts);
    var queueingPort = incomingPorts[connectionId];

    if (queueingPort) {
      queueingPort.accept(port, onMessage);
    } else {
      incomingPorts[connectionId] = new Base(port, onMessage);
    }

    if (port.onDisconnect) {  // chrome extension
      port.onDisconnect.addListener(function () {
        delete incomingPorts[connectionId];
      }.bind(this));
    }

    if (DEBUG) console.log("connect "+connectionId+" to "+port);
  },

  proxyMessage: function(tabId, outgoingPorts, message) {
    var port = outgoingPorts[tabId];
    if (!port) { // no devtools open for the page
      port = outgoingPorts[tabId] = new Base();
    }
    port.postMessage(message);
    if (DEBUG) console.log("proxyMessage to %o: %o", port, message);
  },
}

//-----------------------------------------------------------------------------
// Match content-script ports to devtools ports and ferry messages between them.

function ChromeDevtoolsProxy() {
  this.devtoolsPorts = {};
  this.backgroundPorts = {};

  function onConnect(port) {

    if(port.name.indexOf('devtools') === 0) {
      var tabId = port.name.split('-')[1];
      this.addPort(port, tabId, this.devtoolsPorts, this.backgroundPorts);
    } else {
      var tabId = port.sender.tab.id;
      this.addPort(port, tabId, this.backgroundPorts, this.devtoolsPorts);
    }
  }

  chrome.extension.onConnect.addListener(onConnect.bind(this));
}

ChromeDevtoolsProxy.prototype = ProxyBasePrototype;

//-----------------------------------------------------------------------------
// Match webpage ports to content-script ports and ferry messages between them.

function ContentScriptProxy() {
  this.backgroundPorts = {};
  this.webpagePorts = {};

  /// This will be the background page
  var port = chrome.extension.connect({name: 'content-script'});
  this.addPort(port, 'content-script', this.backgroundPorts, this.webpagePorts);

  this.targetOrigin = getWebOrigin(window.location.href);

  // Listen for web page connections
  //
  var onChannelPlate = function(event) {

    if (event.data !== 'ChannelPlate') {
      return;
    }

    if (this.targetOrigin !== event.origin) {
      return;
    }

    this.addPort(event.ports[0], 'content-script', this.webpagePorts, this.backgroundPorts);

    // Once we addPort to the child window stop listening for it to connect.
    //
    window.removeEventListener('message', onChannelPlate);
  }.bind(this);

  window.addEventListener('message', onChannelPlate);

}

ContentScriptProxy.prototype = ProxyBasePrototype;

//-----------------------------------------------------------------------------


  ChannelPlate.ConnectedChromeBackgroundPage = ConnectedChromeBackgroundPage;
  ChannelPlate.ContentScriptProxy = ContentScriptProxy;
  ChannelPlate.ChromeDevtoolsProxy = ChromeDevtoolsProxy;

}(this));
