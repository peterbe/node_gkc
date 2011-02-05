//var L = require('../utils').L;
var EditDistanceMatcher = require('../edit_distance').EditDistanceMatcher;
var testCase = require('nodeunit').testCase;

module.exports = testCase({
   test_match: function(test) {
      var edm = new EditDistanceMatcher(["peter"]);
      test.equal(typeof edm.match('petter'), 'object');
      test.equal(typeof edm.match('junk'), 'object');
      // edm.match returns an array and remember,
      // in javascript ['peter'] == ['peter'] => false
      test.equal(edm.match("petter").length, 1);
      test.equal(edm.match("petter")[0], 'peter');
      test.equal(edm.match("junk").length, 0);
      test.done();
   },
   test_is_matched: function(test) {
      var edm = new EditDistanceMatcher(["peter"]);
      test.equal(typeof edm.is_matched('petter'), 'boolean');
      test.equal(typeof edm.is_matched('junk'), 'boolean');
      test.ok(edm.is_matched("petter"));
      test.ok(!edm.is_matched("junk"));
      test.done();
   },

   test_match_multiple_candidates: function(test) {
      var edm = new EditDistanceMatcher(["peter", 'piter']);
      test.equal(edm.match('petter').length, 1);
      test.equal(edm.match('petter')[0], 'peter');
      test.equal(edm.match('pitter').length, 1);
      test.equal(edm.match('pitter')[0], 'piter');
      test.done();
   }

});
