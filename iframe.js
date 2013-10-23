// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function (global) {

    "use strict";
    var DEBUG = false;

    if (!global.ChannelPlate)
      throw new Error("require ChannelPlate");

    //-----------------------------------------------------------------------------
    // For communicating from a window to an iframe child

    ChannelPlate.iframe = {

        // These methods run in parent of iframe.
        connect: function(existingIframeElement, srcURLToAssign, onConnect) {
          function filterOnConnect(messagePort, url) {
            if (url.indexOf(srcURLToAssign) !== -1) {
              ChannelPlate.mixinPropertyEvent(messagePort, 'onMessage');
              messagePort.onmessage = function(messageEvent) {
                messagePort.onMessage.fireListeners(messageEvent.data);
              }
              onConnect(messagePort);
            }

          }
          ChannelPlate.getServerPort(srcURLToAssign, filterOnConnect);
          if (!existingIframeElement) {
            throw new Error("First argument must be an existing iframe");
          }
          existingIframeElement.src = srcURLToAssign;
        },

        startServer: function(existingIframeElement, srcURLToAssign, serverFunctions, onServerReady) {
            this.connect(existingIframeElement, srcURLToAssign, function(messagePort) {
              var server = new ChannelPlate.Responder(serverFunctions, messagePort);
              if (onServerReady)
                onServerReady(server);
            });
        },

        // These methods run in the iframe.
        parent: {
            connect: function(onConnect) {
                onConnect(ChannelPlate.getClientPort(window.parent));
            },

            startClient: function(serverAPI, onClientReady) {
                this.connect(function(messagePort) {
                    var serverProxy = (new ChannelPlate.Requestor(serverAPI, messagePort)).serverProxy();
                    onClientReady(serverProxy);
                });
            }
        },

    }

}(this));
