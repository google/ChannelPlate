

var RnRPortUtil = {
  assertFunction: function(onmessage) {
    if (!onmessage || ! typeof onmessage === 'function' ) {
      throw new Error("onmessage argument must be a function");
    }
  },

  getWebOrigin: function(href) {
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

}

function RnRPort(rawPort, onMessage) {
  if (rawPort) {
    this.port = rawPort;  
    this.port.onMessage.addListener(onMessage);
  }
}

RnRPort.prototype = {

  accept: function(port, onMessage) {
    this.port = port;
    this.port.onMessage.addListener(onMessage);
    this.drainQueue();
  },

  postMessage: function(message) {
    if (this.port) {
      this.port.postMessage(message);
    } else {
      this.queue = this.queue || [];
      this.queue.push(message);
    }
  },

  drainQueue: function() {
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

function RnRClient(eventWindow, onMessage) {
  RnRPortUtil.assertFunction(onMessage);
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging
  
  // We will be the client and post to the listening parent (server)
  this.channel = new window.MessageChannel();

  // We allow the parent from any origin
  this.targetOrigin = "*";
  
  // One of the ports is kept as the local port
  this.port = this.channel.port1;
  
  // The other port is sent to the remote side
  eventWindow.postMessage('RnRPort', this.targetOrigin, [this.channel.port2]);

  // Implicitly start the port
  this.port.onmessage = onMessage;

  window.addEventListener('unload', function onUnload() {
     this.port.close();
   }.bind(this));
}

RnRClient.prototype = Object.create(RnRPort.prototype);

//-----------------------------------------------------------------------------
//  For communicating from an iframe to its window.parent

function RnRChildIframePort(onMessage) {
  RnRClient.call(this, window.parent, onMessage);
}

RnRChildIframePort.prototype = Object.create(RnRClient.prototype);

//-----------------------------------------------------------------------------
//  For communicating from a web page to its content window

function WebPageRnRPort(onMessage) {
  RnRClient.call(this, window, onMessage);
}

WebPageRnRPort.prototype = Object.create(RnRClient.prototype);
//-----------------------------------------------------------------------------
// web window Server, listening for connection 

function RnRServerPort(clientURL, onMessage) {
  RnRPortUtil.assertFunction(onMessage);

  this.targetOrigin = RnRPortUtil.getWebOrigin(clientURL);

  // The instance properties will not be set until we are sent a valid event
  //
  var onRnRPort = function(event) {

    if (event.data !== 'RnRPort') {
      return;
    } 

    // We must be contacted by the childIframe after it has a valid contentWindow.
    //
    if (this.targetOrigin !== event.origin) {
      return;
    }

    this.port = event.ports[0];
    
    this.port.onmessage = onMessage;

    // Send pending messages
    this.drainQueue();
    
    // Once we bind to the child window stop listening for it to connect.
    //
    window.removeEventListener('message', onRnRPort);
  }.bind(this);

  window.addEventListener('message', onRnRPort);
}

RnRServerPort.prototype = Object.create(RnRPort.prototype);

//-----------------------------------------------------------------------------
// For communicating from a window to an iframe child

function RnRParentPort(childIframe, onMessage) {
  RnRServerPort.call(childIframe.src, onMessage);
}

RnRParentPort.prototype = Object.create(RnRServerPort.prototype);

//-----------------------------------------------------------------------------
// For background pages listening for 
// foreground pages by name.

function RnRPortChromeBackground(waitForName, onMessage) {
  this.becomeListener(waitForName, onMessage);
}

RnRPortChromeBackground.prototype = Object.create(RnRPort.prototype);

RnRPortChromeBackground.prototype.becomeListener = function(theirName, onMessage) {
  console.log(window.location + " becomeListener for "+theirName);
  function onConnect(port) {
    console.log("onConnect ", port)
    if (port.name === theirName) {
      this.port = port;
      this.port.onMessage.addListener(onMessage);
      this.drainQueue();
    }
  }
  chrome.extension.onConnect.addListener(onConnect.bind(this));
}

//-----------------------------------------------------------------------------
// For foreground pages to contact background pages.
// Note  the name argument on each content script must be unique 

function RnRPortChromeForeground(myName, onMessage) {
  this.port = chrome.extension.connect({name: myName});
  function onDisconnect(event){
    console.log("ChromeTalker onDisconnect ", event);
     delete this.port;
  }
  this.port.onDisconnect.addListener(onDisconnect.bind(this));
  this.port.onMessage.addListener(onMessage);
}

RnRPortChromeForeground.prototype = Object.create(RnRPortChromeBackground.prototype);


function RnRPortDevtoolsForeground(onMessage) {
  var name = "devtools-" + chrome.devtools.inspectedWindow.tabId;
  RnRPortChromeForeground.call(this, name, onMessage);
}

RnRPortDevtoolsForeground.prototype = Object.create(RnRPortChromeForeground.prototype);

//-----------------------------------------------------------------------------
// Common functions for proxies

var RnRProxyPrototype = {

  bind: function(port, connectionId, myPorts, otherPorts) {
    var onMessage = this.proxyMessage.bind(this, connectionId, otherPorts);
    var queueingPort = myPorts[connectionId];
    
    if (queueingPort) {
      queueingPort.accept(port, onMessage);
    } else {
      myPorts[connectionId] = new RnRPort(port, onMessage);
    }
    
    port.onDisconnect.addListener(function () {
      delete myPorts[connectionId];
    }.bind(this));
    
    console.log("connect to "+port.name);
  }, 

  proxyMessage: function(tabId, ports, message) {
    var port = ports[tabId];
    if (!port) { // no devtools open for the page
      port = ports[tabId] = new RnRPort();
    }    
    port.postMessage(message);
    console.log("proxyMessage %o: %o", port, message);
  },
}

//-----------------------------------------------------------------------------
// Match content-script ports to devtools ports and ferry messages between them.

function RnRPortChromeDevtoolsProxy() {
  this.devtoolsPorts = {};
  this.contentScriptPorts = {};

  function onConnect(port) {

    if(port.name.indexOf('devtools') === 0) {
      var tabId = port.name.split('-')[1];
      this.bind(port, tabId, this.devtoolsPorts, this.contentScriptPorts);
    } else {
      var tabId = port.sender.tab.id;
      this.bind(port, tabId, this.contentScriptPorts, this.devtoolsPorts);
    }
  }

  chrome.extension.onConnect.addListener(onConnect.bind(this));
}

RnRPortChromeDevtoolsProxy.prototype = RnRProxyPrototype;

//-----------------------------------------------------------------------------
// Match webpage ports to content-script ports and ferry messages between them.

function ContentScriptRnRProxy() {
  this.contentScriptPorts = {};
  this.webpagePorts = {};

  // Listen for background connection.
  //
  function onConnect(port) { // This will be the background page
    this.bind(port, 'background', this.webpagePorts, this.contentScriptPorts);
  }
  chrome.extension.onConnect.addListener(onConnect.bind(this));

  this.targetOrigin = RnRPortUtil.getWebOrigin(window.location.href);

  // Listen for web page connections
  //
  var onRnRPort = function(event) {

    if (event.data !== 'RnRPort') {
      return;
    } 

    if (this.targetOrigin !== event.origin) {
      return;
    }

    this.bind(port, 'webpage', this.contentScriptPorts, this.webpagePorts);
    
    // Once we bind to the child window stop listening for it to connect.
    //
    window.removeEventListener('message', onRnRPort);
  }.bind(this);

  window.addEventListener('message', onRnRPort);

}

ContentScriptRnRProxy.prototype = RnRProxyPrototype;

// NEXT test ContentScriptRnRProxy proxyMessage
// TODO rename classes
// TODO enclose in RrRPort module
// TODO rename to CommonChannel CommonChannel.ContentScriptProxy CommonChannel.ChromeForeground