// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function workerChannelPlate(global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");

  function WorkerChannelPlate(onMessage) {

    // http://www.whatwg.org/specs/web-apps/current-work/multipage/web-messaging.html#channel-messaging

    // We will be the client and post to the listening parent (server)
    this.channel = new global.MessageChannel();

    // One of the ports is kept as the local port
    this.port = this.channel.port1;

    // The other port is sent to the remote side
    global.postMessage(['ChannelPlate', global.location.href], [this.channel.port2]);

    // Implicitly start the port
    this.port.onmessage = onMessage;
  }

  WorkerChannelPlate.prototype = Object.create(ChannelPlate.Base.prototype);

  ChannelPlate.WorkerChannelPlate = WorkerChannelPlate;

}(this));