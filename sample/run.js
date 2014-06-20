var http=require('http');
var phantom=require('node-phantom-simple');
var fs=require('fs');

var server=http.createServer(function(request,response){
	response.writeHead(200,{"Content-Type": "text/html"});
	response.end('<html><head></head><body><h1>Hello World</h1></body></html>');
}).listen();

var phantomjs = require('phantomjs');

phantom.create(function(err,ph){
	ph.createPage(function(err,page){
		page.open('http://localhost:'+server.address().port,function(err,status){
			page.evaluate(function(element){
				console.log("test");
				window.callPhantom(element);
				window.callPhantom("b");
				window.callPhantom("c");
			}, function(err, result){
				console.log(result === null);
			}, 'a'); // 0 is time to wait before execution
			page.onCallback = function(result){
				console.log(result);
			};
			page.onConsoleMessage = function(message){
				console.log("Message from Phantom: " + message);
			};	
			page.render('./testrender2.png',function(err){
				
			});
			page.render(__dirname+'/testrender.png',function(err){
				
			});
			console.log("!");
			//server.close();
			//ph.exit();

			
			/*assert.ifError(err);
			assert.equal(status,'success');
			page.render(testFilename,function(err){
				assert.ifError(err);
				assert.equal(fileHash(testFilename),fileHash(verifyFilename));
				fs.unlinkSync(testFilename); //clean up the testfile
				
				done();
			});*/
		});
	});
}, {
	phantomPath: phantomjs.path
});