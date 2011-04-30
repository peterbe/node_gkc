var L = require('../utils').L;
var Battle = require('../battle').Battle;
var models = require('../models');

var MockClient = function(sessionId) {
   this.sessionId = sessionId;
   this._sent_messages = [];
};

MockClient.prototype.send = function(msg) {
   L("SENT", this.sessionId, msg);
   this._sent_messages.push(msg);
};

var Fixtures = (function() {
   return {
      battle_two_clients: function (callback) {
	 var battle = new Battle();
	 var client = new MockClient('1');
	 battle.add_participant(client, 'abc123', function() {
	    var client2 = new MockClient('2');
	    battle.add_participant(client2, 'def456', function() {
	       callback(battle, client, client2);
	    });
	 });
      },
      question_with_genre: function (callback) {
	 var genre = new models.Genre();
	 genre.name = "Geography";
	 genre.save(function(err) {
	    var question = new models.Question();
	    question.text = 'Hungry?';
	    question.answer = 'Yes';
	    question.alternatives = ['Yes', 'Very', 'No', 'Rav'];
	    question.spell_correct = true;
	    question.state = 'PUBLISHED';
	    question.genre = {
	       "ref" : "genres",
	       "oid" : genre._id
	    };
	    question.save(function(err) {
	       callback(question, genre);
	    });
	 });
      }
   }
})();

exports.Fixtures = Fixtures;
exports.MockClient = MockClient;