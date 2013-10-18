// Google BSD license http://code.google.com/google_bsd_license.html
// Copyright 2013 Google Inc. johnjbarton@google.com

importScripts("../ChannelPlate.js");
importScripts("../WorkerChannelPlate.js");
importScripts("../RemoteMethodCall.js");

var DEBUG = false;
var TIME_LIMIT = 1000;

function tookTooLong() {
	console.log('FAIL: server did not respond within ' + TIME_LIMIT + ' millisecs.')
}

var timeoutId = setTimeout(tookTooLong, TIME_LIMIT);

var serverMethods = {
	add: function(lhs, rhs, resultsBack, errBack){},
	div: function(lhs, rhs, resultsBack, errBack){},
	terminate: function(lhs, rhs, resultsBack, errBack){}
}

var proxy = (new RemoteMethodCall.Requestor(serverMethods, ChannelPlate.WorkerChannelPlate)).serverProxy();

proxy.add(2,2, function(result){
	if (result === 4) {
		console.log('PASS: ' + result);
	} else {
		console.log('FAIL: ' + result)
	}
	proxy.div(2,0,
		function(result){
			console.log('FAIL: ' + result);
			clearTimeout(timeoutId);
		},
		function (err) {
			console.log('PASS: ' + err);
			proxy.terminate(function(){
				console.log('PASS terminate');
			}, function() {
				console.log('FAIL terminate');
			});
			clearTimeout(timeoutId);
		}
	);
});
