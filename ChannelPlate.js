// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2011 Google Inc. johnjbarton@google.com

// ChannelPlate:  a switchplate, covering over API differences in MessageChannel APIs.
//  Pass your onMessage handler to the constructor,
//  send your messages via method postMessage(message)

var ChannelPlate = (function channelPlateModule(global) {

"use strict";
var DEBUG = false;
var RESPONSE = 'Response';
var ERROR = 'Error';
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

function propertyEvent(propertyName) {
  var mixMe = {};

  mixMe[propertyName] = {
    set metaListener(listenerCallback) {
      this._metaListener = listenerCallback;
    },

    addListener: function(listenerCallback) {
      if (typeof listenerCallback !== "function")
          throw "addListener: listenerCallback must be a function";
      this._listeners = this._listeners || [];
      this._listeners.push(listenerCallback);
      if (this._metaListener && this._listeners.length === 1)
        this._metaListener(true);
    },

    removeListener: function(listenerCallback) {
      var listeners = this._listeners;

      for (var i = 0; i < listeners.length; ++i) {
        if (listeners[i] === listenerCallback) {
          listeners.splice(i, 1);
          break;
        }
      }
      if (this._metaListener && !this._listeners.length)
        this._metaListener(false);
    },

    fireListeners: function()
    {
      if (!this._listeners)
        return;
      var listeners = this._listeners.slice();
      for (var i = 0; i < listeners.length; ++i)
        listeners[i].apply(null, arguments);
    },

  };
  return mixMe;
}

function mixin(receiver, supplier) {
  Object.keys(supplier).forEach(function(property) {
    Object.defineProperty(receiver, property, Object.getOwnPropertyDescriptor(supplier, property));
  });
  return receiver;
}

function mixinPropertyEvent(receiver, propertyName) {
  return mixin(receiver, propertyEvent(propertyName));
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

function getClientPort(eventWindow) {
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging

  // We will be the client and post to the listening parent (server)
  var channel = new global.MessageChannel();

  // We allow the parent from any origin
  var targetOrigin = "*";

  // The other port is sent to the remote side
  eventWindow.postMessage(['ChannelPlate', window.location.href], targetOrigin, [channel.port2]);

  // One of the ports is kept as the local port
  var port = channel.port1;

  window.addEventListener('unload', function onUnload() {
     port.close();
   }.bind(this));

  return port
}

//-----------------------------------------------------------------------------
// web window Server, listening for connection

function getServerPort(clientWebOriginOrURL, onConnect) {
  // If the url is relative the origin will match window.location
  var targetOrigin = getWebOrigin(clientWebOriginOrURL) || getWebOrigin(window.location.toString());

  function onChannelPlate(event) {
    if (DEBUG) {
      console.log("ChannelPlate.getServerPort.onChannelPlate for targetOrigin " + targetOrigin);
    }
    if (!event.data || !event.data[0] || event.data[0] !== 'ChannelPlate') {
      // We are a port-creator for ChannelPlate, nothing else.
      return;
    }

    if (event.origin !== "null" && targetOrigin !== event.origin) {
      // The event.origin was either unexpected or unset.
      return;
    }

    window.removeEventListener('message', onChannelPlate);
    onConnect(event.ports[0], event.data[1]);

    if (DEBUG) {
      console.log('ChannelPlate.getServerPort.onChannelPlate CONNECT ' + window.location.href);
    }
  }

  if (DEBUG) {
    console.log('ChannelPlate.getServerPort start listening for ChannelPlate connect in ' + window.location.href);
  }

  window.addEventListener('message', onChannelPlate);
}
//-----------------------------------------------------------------------------
// A ChannelPlate Listener that converts requests to method calls and
// returns to responses

function Responder(serverMethods, rawPort) {
  this.serverMethods = serverMethods;

  this.onMessage = function(message) {
    var payloadArray = message;
    var postId = payloadArray.shift();
    var method = payloadArray.shift();

    if (method in this.serverMethods && (typeof this.serverMethods[method] === 'function') ) {
      var args = payloadArray;
      args.push(this.onReply.bind(this, postId, method));
      args.push(this.onError.bind(this, postId, method));
      try {
        this.serverMethods[method].apply(this.serverMethods, args);
      } catch (exc) {
        var jsonableExc = {message: exc.message, stack: exc.stack};
        this.onException(postId, method, [jsonableExc]);
      }
    } else {
      this.onException(postId, method, ['No Such Method']);
    }
  };

  this.onReply =function(postId, method, args) {
    var args = Array.prototype.slice.call(arguments, 2);
    this.channelPlate.postMessage([postId, method, RESPONSE].concat(args));
  };

  this.onError = function(postId, method, args) {
    var args = Array.prototype.slice.call(arguments, 2);
    this.channelPlate.postMessage([postId, method, ERROR].concat(args));
  };

  this.onException = function(postId, method, args) {
    var args = Array.prototype.slice.call(arguments, 2);
    this.channelPlate.postMessage([postId, method, ERROR, "Exception"].concat(args));
  };

  this.accept = function(port) {
    this.channelPlate.accept.apply(this.channelPlate, [port, this.onMessage.bind(this)]);
  }

  this.channelPlate = new ChannelPlate.Base(rawPort, this.onMessage.bind(this));
}

//---------------------------------------------------------------------------------------
// A ChannelPlate that converts method calls to requests and responses to returns.
//

function Requestor(serverMethods, messagePort) {
  this.postId = 0;
  this.responseHandlers = [];
  this._serverProxy = this._createProxy(serverMethods);
  this._messagePort = messagePort;
  this.instance = ++Requestor.instance;
  this._messagePort.onmessage = this._onMessage.bind(this);
}

Requestor.instance = 0;

Requestor.prototype = {

  serverProxy: function() {
    return this._serverProxy;
  },

  request: function(method, args, onResponse, onError) {
    this.responseHandlers[++this.postId] = {method: method, onResponse: onResponse, onError: onError};
    this._messagePort.postMessage([this.postId, method].concat(args));
    if (DEBUG) {
      console.log("Requestor "+ this.instance + " sent " + this.postId + ': ' + method, args);
    }
  },

  terminate: function() {
    this._messagePort.close();
  },

  _onMessage: function(event) {
    var payloadArray = event.data || event; // w3C || chrome extension
    var postId = payloadArray.shift();
    var method = payloadArray.shift();
    var responseHandler = this.responseHandlers[postId];
    if (!responseHandler) {
      console.error("Requestor "+ this.instance + " _onMessage failed, no responseHandler for postId " + postId, this.responseHandlers);
      return;
    }
    if (method !== responseHandler.method) {
      console.error("Requestor "+ this.instance + " protocol error, remote method does not match local method");
      return;
    }
    var args = payloadArray;
    var status = args.shift();
    var callback = responseHandler.onResponse;
    var errback = responseHandler.onError;
    try {
      if (callback && status === RESPONSE) {
        callback.apply(this, args);
      } else if (status === ERROR) {
        if (errback)
          errback.apply(this, args);
        else
          console.error('ChannelPlate.Requestor._onMessage ERROR (no errback) ', args);
      }
      if (DEBUG) {
        console.log("ChannelPlate.Requestor._onMessage " + postId + ": " + method + ": " + status, args);
      }
    } catch(exc) {
      console.error("Requestor "+ this.instance + " callback failed: "+(exc.stack ?exc.stack:exc), exc.stack);
    } finally {
      delete this.responseHandlers[postId];
    }
  },

  _createProxy: function(serverMethods) {
    var proxy = {};
    Object.keys(serverMethods).forEach(function(method) {
      proxy[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        var errback;
        var callback;
        if (typeof args[args.length - 1] === 'function') {
          if (typeof args[args.length - 2] === 'function') {
            errback = args.pop();
          }
          callback = args.pop();
        }
        this.request(method, args, callback, errback);
      }.bind(this);
    }.bind(this));

    return proxy
  }

};
//-----------------------------------------------------------------------------
// Define our exports

return {
  // Utility function for derived classes
  mixinPropertyEvent: mixinPropertyEvent,
  // Base class for accepted connetion ports
  Base: Base,
  // Base class for waiting for connection events
  getServerPort: getServerPort,
  // Returns MessagePort for starting connections
  getClientPort: getClientPort,
  // Remote Method call Client
  Requestor: Requestor,
  // Remote Method call Server
  Responder: Responder
};

}(this));
