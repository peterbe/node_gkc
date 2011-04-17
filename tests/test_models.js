var assert = require('assert'); // core node module
var L = require('../utils').L;
var testCase = require('nodeunit').testCase;
var models = require('../models');
var mongoose = require('mongoose');

/*
var connection = mongoose.connect('mongodb://localhost/test-gkc', function(err) {
   if (err) throw new Error(err.message);
});
*/

module.exports = testCase({
   setUp: function(callback) {
      connection = mongoose.connect('mongodb://localhost/test-gkc', function(err) {
	 models.User.remove({}, function(err, stuff) {
	    models.Question.remove({}, function(err) {
	       callback();
	    });
	 });
      });
   },
   tearDown: function(callback) {
      models.User.remove({}, function(err, stuff) {
	 models.Question.remove({}, function(err) {
	    connection.connection.close(function(err) {
	       callback();
	    });
	 });
      });
   },
   test_user_basics: function(test) {
      models.User.count({}, function(err, count) {
	 test.ok(!count);
	 var user = new models.User();
	 user.username = "peterbe";
	 user.save(function(err) {
	    test.done();
	 });
      });
   },
   test_question_basics: function(test) {
      models.Question.count({}, function(err, count) {
	 test.ok(!count);
	 test.done();
      });
   },
   test_findAuthor: function(test) {
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var question = new models.Question();
	 // fake a dbref
	 question.author = {
	    "ref" : "users",
	    "oid" : user._id
	 };
	 question.save(function(err) {
	    question.findAuthor(function(err, u) {
	       // the reason for using assert.ok() instead of test.ok()
	       // is because test.ok() doesn't stop the tests if it fails!
	       // XXX bug??
	       //test.ok(u);
	       assert.ok(u);
	       assert.ok(!err);
	       test.equal(u.doc.username, 'peterbe');
	       test.done();
	    });
	 });
      });      
   },
   test_findGenre: function(test) {
      var genre = new models.Genre();
      genre.name = "Geography";
      genre.save(function(err) {
	 var user = new models.User();
	 user.username = "peterbe";
	 user.save(function(err) {
	    var question = new models.Question();
	    // fake a dbref
	    question.genre = {
	       "ref" : "genres",
	       "oid" : genre._id
	    };
	    question.author = {
	       "ref" : "users",
	       "oid" : user._id
	    };
	    question.save(function(err) {
	       question.findGenre(function(err, u) {
		  // the reason for using assert.ok() instead of test.ok()
		  // is because test.ok() doesn't stop the tests if it fails!
		  // XXX bug??
		  //test.ok(u);
		  assert.ok(u);
		  assert.ok(!err);
		  test.equal(u.doc.name, 'Geography');
		  test.done();
	       });
	    });
	 });
      });
   },
   test_questions_answered_basics: function(test) {
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var question = new models.Question();
	 // fake a dbref
	 question.author = {
	    "ref" : "users",
	    "oid" : user._id
	 };
	 question.save(function(err) {
	    var question_answered = new models.QuestionAnswered();
	    question_answered.question_id = question._id;
	    question_answered.user_id = user._id;
	    question_answered.right = true;
	    question_answered.answer = "correct!";
	    question_answered.save(function(err) {
	       assert.ok(!err);
	       test.done();
	    });
	 });
      });
   },
   test_battle_basics: function(test) {
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var battle = new models.Battle();
	 battle.no_questions = 5;
	 battle.save(function(err) {
	    test.ok(battle.started);
	    test.ok(!battle.finished);
	    test.equal(battle.no_players, 0); // default
	    test.equal(battle.no_questions, 5);
	    test.ok(!battle.draw);
	    battle.winner = user._id;
	    battle.save(function(err) {
	       test.equal(battle.winner, user._id);
	       test.done();
	    });
	 });
      });
   },
   test_battled_question_basics: function(test) {
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var battle = new models.Battle();
	 battle.no_questions = 2;
	 battle.save(function(err) {
	    var question = new models.Question();
	    question.author = {
	       "ref" : "users",
	       "oid" : user._id
	    };
	    question.save(function(err) {
	       var battled_question = new models.BattledQuestion();
	       battled_question.battle = battle._id;
	       battled_question.user = user._id;
	       battled_question.question = question._id;
	       battled_question.save(function(err) {
		  test.ok(!battled_question.loaded_alternatives);
		  test.ok(!battled_question.right);
		  test.ok(!battled_question.timed_out);
		  test.ok(battled_question.timestamp);
		  test.done();
	       });
	    });
	 });
      });
   }
});
