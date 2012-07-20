var RnRPort = new RnRIframePort(window.parent);

var RnRPortUtil = {
	assertFunction: function(onmessage) {
		if (!onmessage || ! typeof onmessage === 'function' ) {
		  throw new Error("onmessage argument must be a function");
	  }
	},
	getWebOrigin: function(href) {
		throw "TODO";
	}
}

function RnRPort() {

}

RnRPort.prototype = {
  postMessage: function(message) {
  	this.port.postMessage(message, this.targetOrigin);
  }
}

function RnRChildIframePort(onMessage) {
  RnRPortUtil.assertFunction(onMessage);
  // http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging
	
	// The iframe will be the client, it will post to the parent (server)
	this.channel = new window.MessageChannel();

	// We know we are connecting to our parent window.
	this.targetOrigin = getWebOrigin(window.parent.location.href)
	
	// One of the ports is kept as the local port
	this.port = this.channel.port1;
	
	// The other port is sent to the remote side
	window.parent.postMessage('RnRPort', this.targetOrigin, [this.channel.port2]);

	// Implicitly start the port
	this.port.onmessage = onmessage;
}

RnRChildIframePort.prototype = Object.create(RnRPort);

function RnRParentPort(childIframe, onmessage) {
  RnRPortUtil.assertFunction(onMessage);

  // The instance properties will not be set until we are sent a valid event
  //
  function onRnRPort(event) {
    if (event.data !== 'RnRPort') {
    	return;
    } 

    // We must be contaced by the childIframe after it has a valid contentWindow.
    //
    this.targetOrigin = RnRPortUtil.getWebOrigin(childIframe.contentWindow);
    if (this.targetOrigin !== event.origin) {
    	delete this.targetOrigin;
    	return;
    }

    this.port = event.ports[0];
    childIframe.contentWindow.addEventListener('unload', function onUnload() {
    	this.port.close();
    });

    this.port.onmessage = onMessage;
    
    // Once we bind to the child window stop listening for it to connect.
    //
    window.removeEventListener('message', onRnRPort);
  }.bind(this));

  window.addEventListener('message', onRnRPort);
}

RnRParentPort.prototype = Object.create(RnRPort);
