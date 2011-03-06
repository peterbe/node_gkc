var L = require('./utils').L;

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
   //this.database = Database();

};

Battle.prototype.save = function() {
   L("Save the current state to the database");
};

Battle.prototype.send_to_all = function(msg) {
   // XXX 
   // this needs to be replaced with a forEach(this.participants, function(each) { each.send(msg) })
   for (var i=0, len=this.participants.length; i < len; i++) {
      this.participants[i].send(msg);
   }
};

Battle.prototype.send_to_everyone_else = function(except, msg) {
   for (var i=0, len=this.participants.length; i < len; i++) {
      if (except != this.participants[i]) {
	 this.participants[i].send(msg);
      }
   }
};

Battle.prototype.send_question = function(question) {
   question.findGenre(function(genre_info) {
      this.send_to_all({question:{
	 text: question.text,
	   id: question.id,
	   genre: question_info.name}
      });
   });
};

Battle.prototype.is_open = function() {
   return this.participants.length < this.options.min_no_people && !this.stopped;
};

Battle.prototype.add_participant = function(participant, user_id) {
   L("user_id", user_id);
   if (this.participants.length >= this.options.max_no_people) {
      throw new Error('Battle full');
   }
   this.participants.push(participant);
   this.user_ids.push(user_id);
   this.scores.push([participant, 0]);
   if (this.participants.length >= this.options.min_no_people) {
      this.ready_to_play = true;
   }
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
      var self = this;
      var user_ids = this.user_ids;
      //L(this.participants);
      models.Question.count({state:'PUBLISHED'}, function(err, count) {
	 // simulate randomness by skipping by the count
	 models.Question.find({state:'PUBLISHED'}, function(err, docs) {
	    if (err) {
	       callback(err, null);
	       return;
	    }
	    docs.forEach(function (question) {
	       //L("QUESTION", question);
	       L("COMPARE", question.author, user_ids);
	       self.current_question = question;
	       callback(null, question);
	    });
	    //L("DOCS")
	    //
	    
	 });
      });
      //this.database.get_next_question(this.user_ids, function(question) {
      //	 self.current_question = question;
//	 callback(null, question);
  //    });
   }
};

var ANSWER_WRONG = 'wrong';
var ANSWER_PERFECT = 'perfect';
var ANSWER_ACCEPTABLE = 'acceptable';

Battle.prototype.check_answer = function(answer, callback) {
   this.check_answer_verbose(answer, function(err, result) {
      callback(err, result != ANSWER_WRONG);
   });
};
Battle.prototype.check_answer_verbose = function(answer, callback) {
   this..get_answer(this.current_question, function(err, answer_obj) {
      if (answer_obj.answer.toLowerCase() == answer.toLowerCase()) {
	 callback(null, ANSWER_PERFECT);
      }
      for (var i=0, len=answer_obj.accept.length; i < len; i++) {
	 if (answer_obj.accept[i].toLowerCase() == answer.toLowerCase()) {
	    callback(null, ANSWER_ACCEPTABLE);
	 }
      }
      if (answer_obj.spell_correct) {
	 var against = [answer_obj.answer.toLowerCase()];
	 for (var i=0, len=answer_obj.accept.length; i < len; i++) {
	    against.push(answer_obj.accept[i].toLowerCase());
	 }
	 var edm = new EditDistanceMatcher(against);
	 if (edm.is_matched(answer.toLowerCase())) {
	    callback(null, ANSWER_ACCEPTABLE);
	 }
      }
      // still here?!
      callback(null, ANSWER_WRONG);
   });
};

Battle.prototype.close_current_question = function() {
   this.sent_questions.push(this.current_question);
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
   this.close_current_question();
   var self = this;
   this.get_next_question(function(err, next_question) {
      if (next_question) {
	 L("Received next_question", next_question);
	 self.send_question(next_question);
      } else {
	 var winner = self.get_winner();
	 if (winner == null) {
	    // this means it was a tie!
	    self.send_to_all({message: 'It\'s a tie!'});
	    next_question = self.get_next_question();
	    self.send_question(next_question);
	 } else {
	    winner.send({winner:{you_won:true}});
	    self.send_to_everyone_else(winner, {winner:{you_won:false}});
	 }
      }
   });
};

Battle.prototype.load_alternatives = function(participant, callback) {
   /* load alternatives of the current question */
   this.loaded_alternatives.push(participant);
   this.database.get_alternatives(this.current_question, callback);
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

for (var i in options) {
   Battle.prototype[i] = options[i];
}

exports.Battle = Battle;
