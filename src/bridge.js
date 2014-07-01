var webpage = require('webpage');
var system  = require('system');
var network = require('./network.js');

phantom.onError = function (message, trace) {
	var mesg = 'PHANTOM ERROR: ' + message;
	if (trace && trace.length) {
		mesg += '\nTRACE:';
		trace.forEach(function(t) {
			mesg += '\n -> ' + (t.file || t.sourceURL)
			mesg += ': '     + t.line;
			if(t.function){
				mesg += ' (in function ' + t.function + ')';
			}
		});
	}

	system.stderr.writeLine(mesg);
	phantom.exit(1);
}


var pages  = {};
var pageId = 1;

var message = network.recieve(function(data, done) {

	var page   = pages[data.page];
	var method = data.method;
	var args   = data.args || [];
	if (data.page && !page) {
		return done('Page with pageId '+data.page+' not found.');
	}
	if (!method) {
		return done('Parameter method must be specified.');
	}

	if (!data.page) {
		return done(null, phantom[method].apply(phantom, args));
	}

	if (method === 'open') {
		page.open.apply(page, args.concat(function (success) {
			done(null, success);
		}));

	} else if (method === 'includeJs') {
		page.includeJs.apply(page, args.concat(function () {
			try {
				done();
			} catch (e) {
				var ignored = /cannot call function of deleted QObject/;
				if (!ignored.test(e))page.onError(e);
			}
		}));

	} else {
		return done(null, page[method].apply(page, args));
	}
});


var callbacks = [
	'onAlert', 'onCallback', 'onClosing', 'onConsoleMessage',
	'onLoadStarted', 'onNavigationRequested', 'onUrlChanged', 
	'onResourceReceived', 'onInitialized', 'onResourceError',
	'onConfirm', 'onError', 'onFilePicker', 'onLoadFinished',
	'onPrompt', 'onResourceRequested', 'onPageCreated'
];

function setup_callbacks (id, page) {
	callbacks.forEach(function (cb) {
		page[cb] = function (parm) {
			var args = Array.prototype.slice.call(arguments);

			if (cb === 'onResourceRequested' && parm.url.indexOf('data:image') === 0) return;
			if (cb === 'onClosing') args = [];
			if (cb === 'onPageCreated') args = [setup_page(args[0])];

			message.send({pageId: id, callback: cb, args: args});
		};
	});
}

function setup_page (page) {
	pageId += 1;
	setup_callbacks(pageId, page);
	pages[pageId] = page;

	page.get = phantom.get;
	page.set = phantom.set;

	page.setFunction = function (name, fn) {
		page[name] = eval('(' + fn + ')');
		return true;
	}

	return pageId;
}

phantom.createPage = function () {
	var page  = webpage.create();
	var id = setup_page(page);
	return { pageId: id };
};

phantom.get = function (prop) {
	return this[prop];
};

phantom.set = function (prop, value) {
	this[prop] = value;
	return true;
};


// Signal start listening
console.log("Server ready");
