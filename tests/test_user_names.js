//var assert = require('assert');
var testCase = require('nodeunit').testCase;
var utils = require('../utils');

var user_names = require('../user_names').user_names;

module.exports = testCase({
   test_basic: function(test) {
      user_names.set(123, 'Peter');
      test.ok(user_names.has(123));
      test.equal(user_names.get(123), 'Peter');
      test.equal(user_names.get(432), 432);
      test.ok(!user_names.has(888));
      test.done();
   }
});
