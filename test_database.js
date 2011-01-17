var L=function() {
   console.log.apply(console, arguments);
};

function assert(x) {
   if (!x) {
      throw new Error('AssertionError (happened two lines below this message)');
   }
}

var Database = require('./database').Database;

function test_database() {
   var d = Database();
   var current_question = d.get_next_question([]);
   assert(current_question.text);
   L(current_question);
   var answer = d.get_answer(current_question);
   assert(answer.answer);
   assert(answer.accept);
   L(answer);
   var next_question = d.get_next_question([current_question]);
   assert(next_question.text != current_question.text);
}

test_database();