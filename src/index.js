'use strict';

var spawn   = require('./spawn.js');
var network = require('./network.js');
var pages   = {};

var pageMethods = [
    'addCookie', 'childFramesCount', 'clearCookies', 'close',
    'currentFrameName', 'deleteCookie', 'evaluateJavaScript',
    'childFramesName', 'includeJs', 'uploadFile', 'injectJs',
    'renderBase64', 'switchToChildFrame', 'goForward', 'set',
    'reload', 'switchToParentFrame', 'openUrl', 'setContent',
    'switchToFrame', 'switchToChildFrame', 'stop', 'getPage',
    'switchToMainFrame', 'switchToFocusedFrame', 'sendEvent',
    'evaluateAsync', 'get', 'open', 'go', 'goBack', 'render',
    'release', 'waitForSelector', 'evaluate', 'setFn'
];

var globalMethods = [
    'injectJs', 'clearCookies', 'set', 'get', 'deleteCookie',
    'addCookie', 'createPage', 'exit', 'on'
];

function isFunc (func) {
    return typeof func === 'function';
}

exports.create = function (cb, options) {
    spawn(options, function (err, instance, port) {
        if (err) { return cb(err); }

        var phantom  = instance;
        var message  = network.recieve(function (data, done) {
            var args = data.args;
            var page = pages[data.pageId];
            var call = (page || phantom)[data.callback];

            if (page) {
                if (data.callback === 'onPageCreated') {
                    var newPage = setupPage(data.args[0], message);
                    if (page.onPageCreated) {
                        page.onPageCreated(newPage);
                    }
                }else if (call) {
                    callAndNormaizedArgs(call, page, args);
                }
            }else if (call) {
                call.apply(phantom, args);
            }
        }, port);

        phantom.once('exit', function () {
            message.close();
        });
        cb(null, setupGlobal(message, phantom));
    });
}

function setupPage (id, message) {
    return pages[id] = buildMethods({
        setFn: function (name, fn, cb) {
            message.send({
                page: id,
                method: 'setFunction',
                args: [name, fn.toString()]
            }, cb);
        },
        evaluate: function (fn, cb) {
            var args = Array.prototype.slice.call(arguments, 2);
            message.send({
                page: id,
                method: 'evaluate',
                args: [fn.toString()].concat(args)
            },  cb);
        },
        waitForSelector: waitForSelector,
    }, pageMethods, id, message);
}

function setupGlobal (message, phantom) {
    return buildMethods({
        process: phantom,
        createPage: function (cb) {
            function oninit (err, result) {
                return cb(null, setupPage(result.pageId, message));
            }
            message.send({method: 'createPage'}, oninit);
        },
        exit: function (cb) {
            phantom.kill('SIGTERM');
            if (cb) { cb(); }
        },
        on: function () {
            phantom.on.apply(phantom, arguments);
        },
    }, globalMethods, null, message);
}

function buildMethods (target, methods, id, message) {
    methods.forEach(function (method) {

        if (target[method]) { return; }
        target[method] = function () {

            var args = Array.prototype.slice.call(arguments);
            var call = isFunc(args[args.length - 1]);

            var mesg = {page: id, method: method, args: args};
            message.send(mesg, call && args.pop());
        }
    });
    return target;
}

function callAndNormaizedArgs (func, page, args) {
    // This 'old' call behaviour is deprecated
    if (args && func.length <= 1) {
        args = args.length === 1 ? args : [args];
    } else {
        args = (args instanceof Array) ? args : [args];
    }
    func.apply(page, args);
}

/*
 * Continuously wait for a selector to be pressent in the phantom
 * page. Once the selector is found or when a timeout occurs the cb
 * is invoked.
 */
function waitForSelector (selector, cb, timeout) {
    var startTime = Date.now();
    var interval  = 150;
    var endedTime = startTime + (timeout || 10000) // 10 sec

    setTimeout(function testForSelector () {

        if (Date.now() > endedTime) {
            return cb('Timeout waiting for selector: ' + selector);
        }

        this.evaluate(function (selector) {
            return document.querySelectorAll(selector).length;

        }, function (result) {
            if (result > 0) {
                cb();
            } else {
                setTimeout(testForSelector, interval);
            }
        }, selector);

    }, interval);
}
