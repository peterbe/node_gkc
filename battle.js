var utils = require('./utils')
  , L = utils.L
  , forEach = utils.forEach
;
   
//var Database = require('./database').Database;
var models = require('./models');
var EditDistanceMatcher = require('./edit_distance').EditDistanceMatcher;

var options = require('../socket.io/lib/socket.io/utils').options
    , merge = require('../socket.io/lib/socket.io/utils').merge;


var Battle = function(options) {
   //this.id = id;
   this.options(merge({
      min_no_people: 2,
      max_no_people: 2,
      no_questions: 5
   }, {}), options);
   this.participants = [];
   this.user_ids = [];
   this.ready_to_play = false;
   this.sent_questions = [];
   this.stopped = false;
   // implementing it as an array because as a hash table I can't use any
   // object as the key
   this.scores = [];
   // used to keep track of who has loaded alternatives to the current question
   this.loaded_alternatives = [];
   // track who has attempted to answer the current question
   this.attempted = [];
   this.battle;
   
};

Battle.prototype.save = function() {
   L("Save the current state to the database");
};

Battle.prototype.send_to_all = function(msg) {
   this.participants.forEach(function(participant) {
      //L("typeof participant", typeof participant);
      if (typeof participant == 'undefined') {
	 L("BATTLE IS BROKEN!");
      } else {
	 participant.send(msg);
      }
   });
    
};

Battle.prototype.send_to_everyone_else = function(except, msg) {
   this.participants.forEach(function(participant) {
      if (except != participant) {
	 participant.send(msg);
      }
   });
};

Battle.prototype.send_question = function(question) {
   var self = this;
   question.findGenre(function(genre_info) {
      self.send_to_all({question:{
	 text: question.text,
	   id: question.id,
	   genre: genre_info.name}
      });
   });
};

Battle.prototype.is_open = function() {
   return this.participants.length < this.options.min_no_people && !this.stopped;
};

Battle.prototype.add_participant = function(participant, user_id, callback) {
   L("user_id", user_id);
   if (this.participants.length >= this.options.max_no_people) {
      throw new Error('Battle full');
   }
   var self = this;
   this.setup_battle(user_id, function() {
      self.participants.push(participant);
      self.user_ids.push(user_id);
      self.scores.push([participant, 0]);
      if (self.participants.length >= self.options.min_no_people) {
	 self.ready_to_play = true;
      }
      callback();
   });
};

Battle.prototype.fetch_user_name = function(user_id, callback) {
   models.User.findOne({_id: user_id}, function(err, result) {
      callback(err, result.username);
   });
};

Battle.prototype.disconnect_participant = function(participant) {
   var idx = this.participants.indexOf(participant);
   if (-1 != idx) {
      // note, we don't want to splice (remove) from the list of
      // participants because that will make the battle appear
      // unsaturated and will invite new players to join.
      delete this.participants[idx];
      //this.participants.splice(idx, 1);
   }
   for (var i in this.scores) {
      if (this.scores[i][0] == participant) {
	 this.scores[i] = [participant, -1];
      }
   }
};

Battle.prototype.get_next_question = function(callback) {
   // execute the callback with (error, question)
   if (this.current_question) {
      callback(null, this.current_question);
   } else {
      var user_ids = this.user_ids;
      //L(this.participants);
      //var _found_a_question = false;
      var _search = {state:'PUBLISHED'};
      if (this.sent_questions) {
	 _search['_id'] = {$nin:this.sent_questions};
      }
      var self = this;
      models.Question.count(_search, function(err, count) {
	 // simulate randomness by skipping by the count
	 if (!count) {
	    callback(null, null);
	 } else {
	    var query = models.Question.find(_search);
	    query.limit(1);
	    query.skip(Math.floor(Math.random() * count));
	    //L(query);
	    query.execFind(function(err, docs) {
	       docs.forEach(function (question) {
		  if (err) {
		     callback(err, null);
		  } else {
		     //L("COMPARE", question.doc.author, user_ids);
		     //if (!_found_a_question) {
		     self.current_question = question;
		     callback(null, question);
		     //_found_a_question = true;
		     //}
		  }
	       });
	    });
	 }
      });
   }
};

var ANSWER_WRONG = 'wrong';
var ANSWER_PERFECT = 'perfect';
var ANSWER_ACCEPTABLE = 'acceptable';

Battle.prototype.get_answer = function(question, callback) {
   models.Question.find({_id: question._id}, function(err, docs) {
      if (err) {
	 callback(err, null);
      } else {
	 docs.forEach(function(question) {
	    callback(null, question);
	 });
      }
   });
};

Battle.prototype.check_answer = function(answer, callback) {
   this.check_answer_verbose(answer, function(err, result) {
      callback(err, result != ANSWER_WRONG);
   });
};

Battle.prototype.check_answer_verbose = function(answer, callback) {
   this.get_answer(this.current_question, function(err, answer_obj) {
      //L("ANSWER_OBJ", answer_obj);
      if (answer_obj.answer.toLowerCase() == answer.toLowerCase()) {
	 callback(null, ANSWER_PERFECT);
      } else {
	 var acceptable = false;
	 answer_obj.accept.forEach(function(each) {
	    if (each.toLowerCase() == answer.toLowerCase()) {
	       callback(null, ANSWER_ACCEPTABLE);
	       acceptable = true;
	    }
	 });
	 if (!acceptable && answer_obj.spell_correct) {
	    var against = [answer_obj.answer.toLowerCase()];
	    answer_obj.accept.forEach(function(each) {
	       against.push(each);
	    });
	    var edm = new EditDistanceMatcher(against);
	    if (edm.is_matched(answer.toLowerCase())) {
	       callback(null, ANSWER_ACCEPTABLE);
	       acceptable = true;
	    }
	 }
	 if (!acceptable) 
	   callback(null, ANSWER_WRONG);
      }
   });
};

Battle.prototype.close_current_question = function() {
   if (this.current_question)
     this.sent_questions.push(this.current_question._id);
   this.current_question = null;
   this.loaded_alternatives = [];
   this.attempted = [];
};

Battle.prototype.remember_has_answered = function(participant) {
   this.attempted.push(participant);
};

Battle.prototype.has_answered = function(participant) {
   for (var i in this.attempted) {
      if (this.attempted[i] == participant) {
	 return true;
      }
   }
   return false;
};

Battle.prototype.has_everyone_answered = function() {
   return this.attempted.length == this.participants.length;
};

Battle.prototype.send_next_question = function() {
   L('# sent questions', this.sent_questions.length);
   L('this.no_questions', this.options);
   if (this.sent_questions.length >= this.options.no_questions) {
      // battle is over!
      this.conclude_battle();
   } else {
      var self = this;
      this.get_next_question(function(err, next_question) {
	 if (next_question) {
	    //L("Received next_question", next_question);
	    L("Received next_question", next_question.text);
	    self.send_question(next_question);
	 } else {
	    L("No question sent back");
	    self.send_to_all({error:"No more questions"});
	 }
      });
   }
};

Battle.prototype.conclude_battle = function() {
   // wrap up the battle
   var winner = this.get_winner();
   L('winner', winner);
   if (winner == null) {
      this.battle.draw = true;
      this.battle.save(function(err) {
	 // this means it was a tie!
	 this.send_to_all({message: 'It\'s a tie!'});
	 this.send_to_all({winner:{draw:true}});
      });
   } else {
      this.battle.winner = winner;
      var self = this;
      this.battle.save(function(err) {
	 winner.send({winner:{you_won:true}});
	 self.send_to_everyone_else(winner, {winner:{you_won:false}});
      });
   }      
};

Battle.prototype.load_alternatives = function(participant, callback) {
   /* load alternatives of the current question */
   this.loaded_alternatives.push(participant);
   models.Question.findOne({_id:this.current_question._id}, function(err, question) {
      callback(err, question.alternatives);
   });
};
Battle.prototype.has_alternatives = function(participant) {
   for (var i in this.loaded_alternatives) {
      if (this.loaded_alternatives[i] == participant) {
	 return true;
      }
   }
   return false;
};

Battle.prototype.increment_score = function(participant, score) {
   // because this.scores is a list we have to loop to find where to
   // update the array
   var _participant, _score;
   for (var i in this.scores) {
      _participant = this.scores[i][0];
      if (_participant == participant) {
	 _score = this.scores[i][1];
	 this.scores[i] = [participant, _score + score];
      }
   }
};

Battle.prototype.get_winner = function() {
   /* return which of the participants won */
   var winner, tie, best_score=-1;
   var _score, _participant;
   for (var i in this.scores) {
      _participant = this.scores[i][0];
      _score = this.scores[i][1];
      if (_score > best_score) {
	 winner = _participant;
	 best_score = _score;
      } else if (_score == best_score) {
	 tie = [winner, _participant];
      }
   }
   if (tie) {
      return null;
   } else {
      return winner;
   }
};

Battle.prototype.stop = function(information) {
   this.stopped = true;
   this.send_to_all({stop: information});
}


Battle.prototype.setup_battle = function(user_id, callback) {
   if (!this.battle) {
      this.battle = new models.Battle();
      this.battle.no_questions = this.options.no_questions;
   }
   L("this.users", this.users);
   if (typeof(this.users) == 'undefined') {
      this.users = [user_id];
   } else {
      this.users.push(user_id);
   }
   this.battle.no_people++;
   this.battle.save(function(err) {
      callback(err);
   });
};

for (var i in options) {
   Battle.prototype[i] = options[i];
}

exports.Battle = Battle;
