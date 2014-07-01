/* 
 * This file contains both the pahantom and nodejs communication methods 
 * to send and recieve messages between the two processes.
 *
 * @author Florian Rueberg
 *
 */



// Use `exports.phantom` on phantom to send or recieve messages via a http 
// server. 

// When `GET` is called, stored messages are send back to nodejs. Messages
// that are to be send to node are on the `message_stack` which is emptied
// after all the messages are send.

// To continuously recieve the messages nodejs has to poll the server with
// `GET` requests.

// When nodejs sends a message to phantomjs it uses a `POST` request and a 
// JSON message to transfer data.

// Use `exports.nodejs` on nodejs to send or recieve messages via json web
// requests.

module.exports = { recieve: function(recieve, port) {

	// The return value of this method is send
	var result = {};

	// Detect if this is the phantom or node instance
	var isPhantom = typeof phantom !== 'undefined' && phantom.version && phantom.onError;
	if(isPhantom){

		var message_stack = [];
		var service = function(req, res) {

			// Initially 200 but is changed when an error occures.
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			
			if(req.method === 'GET'){
				// Send all stored messages.
				res.write(JSON.stringify(message_stack));
				res.close();
				message_stack = [];

			}else if(req.method === 'POST'){
				// Called when the request is done
				function done(err, message) {
					if(err){
						message = err;
						res.statusCode = 500;
					}
					res.write(JSON.stringify(message || 'success'));
					res.close();
				}
				// Catch all errors and return them
				try{
					recieve(JSON.parse(req.post), done);
				}catch(err){
					done(err);
				}
				
			}else{
				throw "Unsupported request type!";
			}
		};

		var webserver = require('webserver').create();
		var server = webserver.listen('127.0.0.1:' + (port || 0), service);
		
		// Use this to send messages to nodejs
		result.send = function(message){
			message_stack.push(message);
		};

	}else{ // isNodeJs

		var http     = require('http');
		var interval = (process.env && process.env.POLL_INTERVAL) || 500;

		function request(cb, data){

			var http_opts = {
		        hostname: '127.0.0.1',
		        port: port,
		        path: '/',
		        method: data ? 'POST' : 'GET'
    		};

    		var req = http.request(http_opts, function (res) {
                res.setEncoding('utf8');

                var recieved = '';
                res.on('data', function (chunk) {
                    recieved += chunk;
                });

                res.on('end', function () {
                	cb(res.statusCode === 500, recieved);
                });
            });

            req.on('error', function (err) {
                cb(err);
            });

    		if(data){
				req.setHeader('Content-Type', 'application/json');
				var json = JSON.stringify(data);
				req.setHeader('Content-Length', Buffer.byteLength(json));
            	req.write(json);
    		}

    		req.end();
		}

		var closed  = false;
		var posting = false;
		//var polling = false;

		function poll(cb) {    
	        setTimeout(function () {
	        	if(closed) return;
	        	if(posting) return poll();
	        	//polling = true;

	        	request(function(err, data){
	        		//polling = false;
	        		if(closed) return;

	        		if(err){
	        			if(!closed)console.warn("Poll request error: " + err);
	        			return;
	        		}else{
	        			try{
		                    var results = JSON.parse(data);
		                    results.forEach(recieve);
		                }catch(err){
		                    console.warn("Poll error " + err + " " + data);
		                    return;
		                }
	        			(cb || poll)();
	        		}
	        	});
	        // When a callback is waiting run immediately
	        }, cb ? 0 : interval);
	    };
	    poll();

	    var sendStack = [];

	    function process(){
	    	if(/*!polling && */ !posting && sendStack.length > 0){
	    		
	    		var top = sendStack.shift();
		    	posting = true;
		    	
		    	request(function(err, data){
		    		posting = false;
		    		
		    		poll(function(){
		    			if(top.cb)top.cb(err, JSON.parse(data));
		    			process();
		    		});
		    	}, top.message);
	    	}
	    }

	    result = module.exports;

	    result.send = function(message, cb){
			sendStack.push({message: message, cb: cb});
			process();
		};

		result.close = function(){
			closed = true;
		};
	}

	return result;
}};