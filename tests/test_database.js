//var assert = require('assert');
//var utils = require('../utils');
var testCase = require('nodeunit').testCase;
var Database = require('../database').Database;

module.exports = testCase({
   setUp: function(callback) {
      callback();
   },
   tearDown: function(callback) {
      callback();
   },
   test_basic: function(test) {
      var d = Database();
      var current_question = d.get_next_question([]);
      test.ok(current_question.text);
      //L(current_question);
      var answer = d.get_answer(current_question);
      test.ok(answer.answer);
      test.ok(answer.accept);
      //L(answer);
      var next_question = d.get_next_question([current_question]);
      test.ok(next_question.text != current_question.text);
      test.done();
   },
   test_loading_alternatives: function(test) {
      var d = Database();
      var current_question = d.get_next_question([]);
      var alts = d.get_alternatives(current_question);
      test.ok(alts);
      test.done();
   }
});
