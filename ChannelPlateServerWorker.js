// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

(function channelPlateServerWorker(global) {

  "use strict";
  var DEBUG = false;

  if (!global.ChannelPlate)
    throw new Error("require ChannelPlate");
  if (!global.RemoteMethodCall)
    throw new Error("require RemoteMethodCall");
  if (!ChannelPlate.ConnectedWorker)
    throw new Error("require ChannelPlate.ConnectedWorker");
  //-----------------------------------------------------------------------------
  // For spawning a Worker with a ChannelPlate connection

  function ServerWorker(workerSrcURL, serverAPI) {
    var serverWorker = this;
    RemoteMethodCall.Requestor.call(this, serverAPI, ChannelPlate.ConnectedWorker.bind(this, workerSrcURL));
  }

  ServerWorker.prototype = Object.create(RemoteMethodCall.Requestor.prototype);

  ChannelPlate.ServerWorker = ServerWorker;

}(this));