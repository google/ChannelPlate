
var name = "devtools-" + chrome.devtools.inspectedWindow.tabId;
var port = new RnRPortChromeForeground(name, function onMessage(message) {
  console.log("devtools got the message ", message);
});

port.postMessage("From devtools to you");