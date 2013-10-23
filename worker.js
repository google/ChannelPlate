// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function (global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

  //-----------------------------------------------------------------------------
  // For spawning a Worker with a ChannelPlate connection
  ChannelPlate.worker = {
    // These methods run in the Web Page
    connect: function(existingWorker, onConnect) {
      function onChannelPlateEvent(event) {
        if (!event.data || !event.data[0] || event.data[0] !== 'ChannelPlate') {
          // We are a port-creator for ChannelPlate, nothing else.
          return;
        }

        var messagePort = event.ports[0];
        ChannelPlate.mixinPropertyEvent(messagePort, 'onMessage');
        messagePort.onmessage = function(messageEvent) {
          messagePort.onMessage.fireListeners(messageEvent.data);
        }

        onConnect(messagePort);
      }

      existingWorker.onmessage = onChannelPlateEvent;
    },

    startClient: function(worker, serverAPI, onClientReady) {
      this.connect(worker, function(messagePort) {
        var serverProxy = (new ChannelPlate.Requestor(serverAPI, messagePort)).serverProxy();
            onClientReady(serverProxy);
      });
    },

    // Thsee methods run in the Worker
    parent: {
      connect: function(onConnect) {

        // We will be the client and post to the listening parent (server)
        var channel = new global.MessageChannel();

        // One port is sent to the remote side
        global.postMessage(['ChannelPlate', global.location.href], [channel.port2]);

        // One of the ports is kept as the local port
        var messagePort = channel.port1;
        ChannelPlate.mixinPropertyEvent(messagePort, 'onMessage');
        messagePort.onmessage = function(messageEvent) {
          messagePort.onMessage.fireListeners(messageEvent.data);
        }

        onConnect(messagePort)
      },

      startServer: function(serverFunctions, onServerReady) {
        this.connect(function(messagePort) {
          var server = new ChannelPlate.Responder(serverFunctions, messagePort);
          if (onServerReady)
            onServerReady(server);
        });
      }
    },
  };


}(this));
