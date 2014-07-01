var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;


module.exports = function (options, cb){

	var path   = options.phantomPath || 'phantomjs';
	var args   = (options.parameters || {});
	var bridge = __dirname + '\\bridge.js';
	var result = [];

	for(var key in args) {
		result.push('--' + key + '=' + args[key]);
	}

    var phantom = spawn(path, result.concat(bridge));

    function fatalError(err) {
    	if(err && err.stack)console.error(err.stack);
        try {
            phantom.kill();
        } catch(e) {}
        process.exit(1);
    };

	// Note it's possible to blow up maxEventListeners doing this. 
	// Consider moving to a single handler.
	var errorEvents = ['SIGINT', 'SIGTERM', 'uncaughtException'];
	errorEvents.forEach(function(e){
		process.on(e, fatalError);
	});
    phantom.once('error', function(err){
    	cb(err);
    });

    var ignorePattern = options.ignoreErrorPattern;
    phantom.stderr.on('data', function (data) {
        if (!ignorePattern || !ignorePattern.exec(data)) {
            console.warn('phantom stderr: ' + data);
        }
    });

    var exitCode = 0;
    phantom.once('exit', function (code) {
    	errorEvents.forEach(function(e){
			process.removeListener(e, fatalError);
		});
        exitCode = code;
    });

    // Wait a bit to see if the spawning of phantomjs immediately
    // fails due to bad path or similar.
    setTimeout(function () {
    	if (exitCode !== 0) {
            var msg = "Phantom immediately exited with: ";
    		return cb(msg + exitCode);
    	}
    }, 100);

    // Wait for 'Server ready' log from phantom
    phantom.stdout.once('data', function (data) {
        // setup normal listener now
        phantom.stdout.on('data', function (data) {
            return console.log('phantom stdout: ' + data);
        });

        // We do this twice - first to get ports this process is 
        // listening on and again to get ports phantom is listening 
        // on. This is to work around this bug in libuv: 
        // https://github.com/joyent/libuv/issues/962 - this is only 
        // necessary when using cluster, but it's here regardless
        getPorts(process.pid, function (procErr, procPorts) {
        	getPorts(phantom.pid, function (phErr, phPorts) {
        		var port;
        		for (var i = 0; i < phPorts.length; i++) {
                    if (procPorts.indexOf(phPorts[i]) == -1) {
                        port = phPorts[i];
                    }
        		}
        		if (port) { cb(null, phantom, port); }
        		else { cb("Error extracting port."); }
        	});
        });
    });
}

// Now need to figure out what port it's listening on - since Phantom 
// is busted and can't tell us this we need to use lsof on mac, and
// netstat on Linux. Note that if phantom could tell you the port it 
// ends up listening on we wouldn't need to do this - server.port 
// returns 0 when you ask for port 0 (i.e. random free port). If they 
// ever fix that this will become much simpler
function getPorts (pid, cb) {

    var platform = require('os').platform();
    var cmd = null;
    switch (platform) {
        case 'linux':
	        cmd = 'netstat -nlp | grep "[[:space:]]' + pid + '/"';
	        break;
        case 'darwin':
            cmd = 'lsof -p ' + pid + ' | grep LISTEN';
            break;
        case 'win32':
            cmd = 'netstat -ano | findstr /R "\\<' + pid + '\\>"';
            break;
        case 'cygwin':
            cmd = 'netstat -ano | grep ' + pid;
            break;
        default:
            var msg = "Your OS is not supported yet. Tell us how\n\
                       to get the listening port based on PID";
            return callback(msg.replace(/\n\s*/,' '));
    }

    exec(cmd, function (err, stdout, stderr) {
    	// Can happen if grep finds no matching lines, so ignore it.
    	if (err !== null)stdout = '';
        
        var ip = /(?:127\.0\.0\.1|localhost|0\.0\.0\.0):(\d+)/ig;
        var match, ports = [];
                
        while (match = ip.exec(stdout)) {
            if(match[1] !== '0')ports.push(match[1]);
        }

        cb(err, ports);
   	});
}