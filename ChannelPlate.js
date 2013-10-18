// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// ChannelPlate:  a switchplate, covering over API differences in MessageChannel APIs.
//  Pass your onMessage handler to the constructor,
//  send your messages via method postMessage(message)

var ChannelPlate = (function channelPlateModule(global) {

"use strict";
var DEBUG = false;

// ----------------------------------------------------------------------------
// Utilities

function assertFunction(onmessage) {
  if (!onmessage || ! typeof onmessage === 'function' ) {
    throw new Error("onmessage argument must be a function");
  }
}

function getWebOrigin(href) {
  // ftp://ftp.rfc-editor.org/in-notes/rfc3986.txt Appendix B
  var reURIString = "^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?";
  var reURI = new RegExp(reURIString);

  // The Web Origin Concept RFC 6454
  //
  var origin = "";
  var m = reURI.exec(href);
  if (m) {
    var scheme = m[2];
    var authority = m[4];

    if (scheme) {
      if (scheme === 'file') {
        origin = "null";
      } else {
        origin += scheme;
        origin += ":";
        if (authority) {
          origin += "//";
          origin += authority;
        }
      }
    }

  } // else malformed

  return origin;
}

function Base(rawPort, onMessage) {
  if (rawPort) {
    this._assign(rawPort, onMessage);
  }
}

Base.channelPlates = 0;

Base.prototype = {

  postMessage: function(message) {
    if (this.port) {
      this.port.postMessage(message);
      return true;
    } else {
      this.queue = this.queue || [];
      this.queue.push(message);
      return false;
    }
  },

  set onmessage(onMessage) {
    function repackage(event) {
      onMessage(event.data, event);
    }
    if (this.port.onMessage) { // chrome extension
      this.port.onMessage.addListener(onMessage);
    } else {  // W3c, implicitly calls start()
      this.port.onmessage = repackage;
    }
    if (this.port.plate !== this)
      console.error("mismatched plates");
  },
  
  terminate: function() {
    this.port.close();
  },

  accept: function(port, onMessage) {
    this._assign(port, onMessage);
    this._drainQueue();
  },

  _assign: function(port, onMessage) {
    this.port = port;
    this.plateNumber = ++Base.channelPlates;
    this.port.plate = this;
    if (onMessage) {
      this.onmessage = onMessage;
    }
  },

  _drainQueue: function() {
    if (this.queue) {
      this.queue.forEach(function(message) {
        this.postMessage(message);
      }.bind(this));
    }
    delete this.queue;
  }
};


//-----------------------------------------------------------------------------
//  Client using eventWindow.postMessaage to send port

function PortClient(eventWindow, onMessage) {
  assertFunction(onMessage);
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging

  // We will be the client and post to the listening parent (server)
  this.channel = new global.MessageChannel();

  // We allow the parent from any origin
  this.targetOrigin = "*";

  // One of the ports is kept as the local port
  this.port = this.channel.port1;

  // The other port is sent to the remote side
  eventWindow.postMessage(['ChannelPlate', loc], this.targetOrigin, [this.channel.port2]);

  // Implicitly start the port
  this.port.onmessage = onMessage;

  window.addEventListener('unload', function onUnload() {
     this.port.close();
   }.bind(this));
}

PortClient.prototype = Object.create(Base.prototype);

//-----------------------------------------------------------------------------
// web window Server, listening for connection

function PortServer(clientWebOriginOrURL, onConnect) {
  // If the url is relative the origin will match window.location
  var targetOrigin = getWebOrigin(clientWebOriginOrURL) || getWebOrigin(window.location.toString());

  function onChannelPlate(event) {
    if (DEBUG) {
      console.log("ChannelPlate.PortServer.onChannelPlate for targetOrigin " + targetOrigin);
    }
    if (!event.data || !event.data[0] || event.data[0] !== 'ChannelPlate') {
      // We are a port-creator for ChannelPlate, nothing else.
      return;
    }

    if (event.origin !== "null" && targetOrigin !== event.origin) {
      // The event.origin was either unexpected or unset.
      return;
    }

    var talkerToken = event.data[1];
    onConnect(event.ports[0], talkerToken);

    if (DEBUG) {
      console.log('ChannelPlate.PortServer.onChannelPlate CONNECT ' + window.location.href);
    }
  }

  if (DEBUG) {
    console.log('ChannelPlate.PortServer start listening for ChannelPlate connect in ' + window.location.href);
  }

  window.addEventListener('message', onChannelPlate);
}
//-----------------------------------------------------------------------------
// Define our exports

return {
  // Base class for accepted connetion ports
  Base: Base,
  // Base class for waiting for connection events
  PortServer: PortServer,
  // Base class for starting connection events
  PortClient: PortClient,
};

}(this));
