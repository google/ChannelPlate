

var XHRInBackground = {
	GET: function(url, callback, errback) {}
};


var proxy = (new ChannelPlate.Requestor(XHRInBackground, ChannelPlate.DevtoolsClientPort)).serverProxy();
    proxy.GET(
    	'http://example.com',
    	function(result) {
    		console.log("result: " + result);
    	},
    	function(err) {
    		console.error("err: " + err);
    	}
    );
