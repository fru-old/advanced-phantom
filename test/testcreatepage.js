var phantom=require('../src/index.js');

exports.testPhantomCreatePage = function(test) {
    phantom.create(function (error, ph) {
        test.ifError(error);
        ph.createPage(function (err,page) {
            test.ifError(err);
            ph.exit();
            test.done();
        });
    }, { phantomPath: require('phantomjs').path });
};
