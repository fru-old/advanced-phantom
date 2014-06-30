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

exports.phantom = function(recieve) {

	var message_stack = [];
	var service = function(req, res) {

		// Initially 200 but is changed when an error occures.
		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/json');
		
		if (req.method === 'GET') {
			// Send all stored messages.
			res.write(JSON.stringify(message_stack));
			res.close();
			message_stack = [];

		} else if (req.method === 'POST') {
			// Called when the request is done
			function done(err, message) {
				if (err) {
					message = err;
					res.statusCode = 500;
				}
				res.write(JSON.stringify(message || 'success'));
				res.close();
			}
			// Catch all errors and return them
			try {
				recieve(JSON.parse(req.post), done);
			} catch(err) {
				done(err);
			}
			
		} else {
			throw "Unknown request type!";
		}
	};

	var webserver = require('webserver').create();
	return {
		server: webserver.listen('127.0.0.1:0', service),

		// Use this to send messages to nodejs
		send: function(message){
			message_stack.push(message);
		}
	};
}



// Use `exports.nodejs` on nodejs to send or recieve messages via json web
// requests.

exports.nodejs = function(){


}