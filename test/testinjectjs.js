var phantom=require('../src/index.js');

exports.testPhantomInjectJs = function(test) {
    phantom.create(function (error,ph) {
        test.ifError(error);
        ph.injectJs('tests/files/injecttest.js', function (err) {
            test.ifError(err);
            ph.exit();
            test.done();
        });
    }, { phantomPath: require('phantomjs').path });
};
