var assert = require('assert');
var utils = require('../utils');

var user_names = require('../user_names').user_names;

function test_simple() {
   user_names.set(123, 'Peter');
   assert.equal(user_names.get(123), 'Peter');
   assert.equal(user_names.get(432), 432);
}

test_simple();
