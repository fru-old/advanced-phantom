var phantom=require('../src/index.js');

exports.testPhantomCreatePagePath = function(test) {
    phantom.create(function (error,ph) {
        test.notStrictEqual(null, error, "Bad path produces an error");
        test.done();
    },{phantomPath:'@@@', ignoreErrorPattern: /execvp/});
};
