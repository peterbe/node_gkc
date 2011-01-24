var assert = require('assert');
var utils = require('../utils');


var Database = require('../database').Database;

function test_database() {
   var d = Database();
   var current_question = d.get_next_question([]);
   assert.ok(current_question.text);
   //L(current_question);
   var answer = d.get_answer(current_question);
   assert.ok(answer.answer);
   assert.ok(answer.accept);
   //L(answer);
   var next_question = d.get_next_question([current_question]);
   assert.ok(next_question.text != current_question.text);
}


// TEST RUNNER!!
test_database();

function test_loading_alternatives() {
   var d = Database();
   var current_question = d.get_next_question([]);
   var alts = d.get_alternatives(current_question);
   assert.ok(alts);
}
test_loading_alternatives();