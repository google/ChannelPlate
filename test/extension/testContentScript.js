var port = new ChannelPlate.ContentScriptClientPort("content-script", function onMessage(message) {
  console.log("ContentScript got the message ", message);
});

port.postMessage("This is your content script calling");
