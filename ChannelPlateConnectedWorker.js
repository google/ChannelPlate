// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function channelPlateConnectedWorker(global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

  //-----------------------------------------------------------------------------
  // For spawning a Worker with a ChannelPlate connection

  function ConnectedWorker(workerSrcURL, onConnect) {
    function onChannelPlateEvent(event) {
      if (!event.data || !event.data[0] || event.data[0] !== 'ChannelPlate') {
        // We are a port-creator for ChannelPlate, nothing else.
        return;
      }
      this.workerToken = event.data[1];
      this.port = event.ports[0];
      onConnect(this.port, this.workerToken);
    }

    this.worker = new Worker(workerSrcURL);
    this.worker.onmessage = onChannelPlateEvent;
  }

  ConnectedWorker.prototype = Object.create(ChannelPlate.Base.prototype);

  ConnectedWorker.prototype.terminate = function() {
    this.terminate();
    this.worker.terminate();
  }

  ChannelPlate.ConnectedWorker = ConnectedWorker;

}(this));