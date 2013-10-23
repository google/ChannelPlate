ChannelPlate
=======

Cover MessageChannel API from W3C, WebWorkers, and chrome extensions:
  1) constructors for common use cases.
  2) uniform API
  3) Remote procedure call

For RPC-like uses between web page (server) and iframe (client):

  In the web page:

  	var methods = {
  	  add: function(lhs, rhs, callback, errback) {
  	  	callback(lhs + rhs);
  	  },
  	};
    ChannelPlate.iframe.startServer(clientFrame, "clientFrame.html", methods);

  In the iframe:

    var serverMethods = {
      add: function(lhs, rhs, resultsBack, errBack){},
      div: function(lhs, rhs, resultsBack, errBack){}
    };

    ChannelPlate.iframe.parent.startClient(serverMethods, function(proxy) {
    	// operation on proxy object are performed in web page.
    });

For RPC-like uses between web page (client) and worker (server)

  In the web page:

    var serverAPI = {
      add: function(lhs, rhs, resultsBack, errBack){},
      div: function(lhs, rhs, resultsBack, errBack){},
    };

    var workerServer = new Worker("testWorkerServer.js");

    ChannelPlate.worker.startClient(workerServer, serverAPI, function(serverProxy) {
    	// operations on proxy object are performed in the worker.
    });

  In the worker:

	var serverMethods = {
      add: function(lhs, rhs, callback, errback) {
        callback(lhs + rhs);
      },
      div: function(lhs, rhs, callback, errback){
        if (rhs === 0) {
            errback("divide by zero");
        } else {
            callback(lhs/rhs);
        }
      },
    };

    ChannelPlate.worker.parent.startServer(serverTestMethods);

In addition to the RPC layer, the endpoints support lower level method connect(),
providing a messagePort, eg

	ChannelPlate.worker.connect(worker, function(workerMessagePort){

	  workerMessagePort.onMessage.addListener(function onMessage(message) {
	    // process incoming message
	  });
	  workerMessagePort.postMessage (outgoingMessage);
	});

Similar code can be created for Chrome extensions but I've not needed these recently.
