var L = require('../utils').L;
var Battle = require('../battle').Battle;
var models = require('../models');
var testCase = require('nodeunit').testCase;
var mongoose = require('mongoose');

var connection = mongoose.connect('mongodb://localhost/test-gkc', function(err) {
   if (err) throw new Error(err.message);
});

var MockClient = function(sessionId) {
   this.sessionId = sessionId;
   this._sent_messages = [];
};

MockClient.prototype.send = function(msg) {
   this._sent_messages.push(msg);
};

module.exports = testCase({
   setUp: function(callback) {
      models.User.remove({}, function(err, stuff) {
	 models.Question.remove({}, function(err) {
	    callback();
	 });
      });
   },
   tearDown: function(callback) {
      models.User.remove({}, function(err, stuff) {
	 models.Question.remove({}, function(err) {
	    callback();
	 });
      });
   },
   test_basic_battle: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client, 'abc123', function() {
	 test.ok(battle.is_open(), 'must be open');
	 var client2 = new MockClient('2');
	 battle.add_participant(client2, 'def456', function() {
	    test.ok(!battle.is_open(), 'max reached');
	    test.done();
	 });
      });
   },
   test_battle_winner_1: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client, 'abc123', function() {
	 test.ok(battle.is_open(), 'must be open');
	 var client2 = new MockClient('2');
	 battle.add_participant(client2, 'def456', function() {
	    battle.increment_score(client2, 1);
	    battle.increment_score(client, 3);
	    test.equal(battle.get_winner(), client);
	    battle.increment_score(client2, 2);
	    test.ok(!battle.get_winner());
	    test.done();
	 });
      });
   },

   test_battle_sending: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client, 'abc123', function() {
	 test.ok(battle.is_open(), 'must be open');
	 var client2 = new MockClient('2');
	 battle.add_participant(client2, 'def456', function() {
	    battle.send_to_everyone_else(client, 'msg 1');
	    test.equal(client._sent_messages.length, 0);
	    test.equal(client2._sent_messages.length, 1);
	    battle.send_to_all('msg 2');
	    test.equal(client._sent_messages.length, 1);
	    test.equal(client2._sent_messages.length, 2);
	    test.done();
	 });
      });
   },

   test_has_answered: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client, 'abc123', function() {
	 test.ok(battle.is_open(), 'must be open');
	 var client2 = new MockClient('2');
	 battle.add_participant(client2, 'def456', function() {
	    test.ok(!battle.has_everyone_answered());
	    test.ok(!battle.has_answered(client));
	    battle.remember_has_answered(client);
	    test.ok(!battle.has_everyone_answered());
	    test.ok(battle.has_answered(client));
	    battle.remember_has_answered(client2);
	    test.ok(battle.has_answered(client2));
	    test.ok(battle.has_everyone_answered());
	    test.done();
	 });
      });
   },
   test_check_answer: function(test) {
      var question = new models.Question();
      question.text = 'Hungry?';
      question.answer = 'Yes';
      question.spell_correct = true;
      question.state = 'PUBLISHED';
      question.save(function(err) {
	 var battle = new Battle();
	 var client = new MockClient('1');
	 battle.add_participant(client, 'abc123', function() {
	    test.ok(battle.is_open(), 'must be open');
	    var client2 = new MockClient('2');
	    battle.add_participant(client2, 'def456', function() {
	       battle.get_next_question(function(err, question) {
		  test.ok(question);
		  var current = question;
		  battle.get_next_question(function(err, question) {
		     // current question hasn't changed
		     test.equal(current, question);
		     battle.check_answer('YES', function(err, right) {
			battle.remember_has_answered(client);
			test.ok(battle.has_answered, true);
			test.ok(!battle.has_everyone_answered());
			test.ok(right);
			battle.check_answer('Yess', function(err, right) {
			   test.ok(right);
			   battle.check_answer('No', function(err, right) {
			      test.ok(!right);
			      battle.close_current_question(function() {
				 test.equal(battle.current_question, null);
				 test.done();
			      });
			   });
			});
		     });
		  });
	       });
	    });
	 });
      });
   },
   test_send_next_question: function(test) {
      var genre = new models.Genre();
      genre.name = "Geography";
      genre.save(function(err) {
	 var question = new models.Question();
	 question.text = 'Hungry?';
	 question.answer = 'Yes';
	 question.spell_correct = true;
	 question.state = 'PUBLISHED';
	 question.genre = {
	    "ref" : "genres",
	    "oid" : genre._id
	 };
	 question.save(function(err) {
	    var client = new MockClient('1');
	    var battle = new Battle();
	    battle.options.no_questions = 1;
	    battle.add_participant(client, 'abc123', function() {
	       test.ok(battle.is_open(), 'must be open');
	       var client2 = new MockClient('2');
	       battle.add_participant(client2, 'def456', function() {
		  battle.send_next_question(function(err) {
		     test.equal(client._sent_messages.length, 1);
		     test.equal(client2._sent_messages.length, 1);
		     battle.close_current_question(function() {
			test.equal(battle.sent_questions.length, 1);
			test.ok(!battle.current_question);
			battle.send_next_question(function(err) {
			   test.equal(client._sent_messages.length, 3);
			   test.equal(client2._sent_messages.length, 3);
			   test.equal(client._sent_messages[2].winner.draw, true);
			   test.equal(client2._sent_messages[2].winner.draw, true);
			   test.done();
			});
		     });
		  });
	       });
	    });
	 });
      });
   },
});
			  
			  
		       