var L = require('./utils').L;

var Database = require('./database').Database;
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
   this.database = Database();

};

Battle.prototype.save = function() {
   L("Save the current state to the database");
};

Battle.prototype.send_to_all = function(msg) {
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
   this.send_to_all({question:{
           text: question.text,
	   id: question.id,
	   genre: question.genre}
   });
};

Battle.prototype.is_open = function() {
   return this.participants.length < this.options.min_no_people && !this.stopped;
};

Battle.prototype.add_participant = function(participant) {
   if (this.participants.length >= this.options.max_no_people) {
      throw new Error('Battle full');
   }
   this.participants.push(participant);
   this.scores.push([participant, 0]);
   if (this.participants.length >= this.options.min_no_people) {
      this.ready_to_play = true;
   }
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

Battle.prototype.get_next_question = function() {
   if (!this.current_question) {
      var x = this.database.get_next_question(this.sent_questions);
      this.current_question = x;
   }
   return this.current_question;
};

var ANSWER_WRONG = 'wrong';
var ANSWER_PERFECT = 'perfect';
var ANSWER_ACCEPTABLE = 'acceptable';

Battle.prototype.check_answer = function(answer) {
   return this.check_answer_verbose(answer) != ANSWER_WRONG;
};
Battle.prototype.check_answer_verbose = function(answer) {
   //L('In check_answer current_question=', this.current_question);
   var answer_obj = this.database.get_answer(this.current_question);
   //L('answer_obj', answer_obj);
   if (answer_obj.answer.toLowerCase() == answer.toLowerCase()) {
      return ANSWER_PERFECT;
   }
   for (var i=0, len=answer_obj.accept.length; i < len; i++) {
      if (answer_obj.accept[i].toLowerCase() == answer.toLowerCase()) {
	 return ANSWER_ACCEPTABLE;
      }
   }
   if (answer_obj.spell_correct) {
      var against = [answer_obj.answer.toLowerCase()];
      for (var i=0, len=answer_obj.accept.length; i < len; i++) {
         against.push(answer_obj.accept[i].toLowerCase());
      }
      var edm = new EditDistanceMatcher(against);
      if (edm.is_matched(answer.toLowerCase())) {
         return ANSWER_ACCEPTABLE;
      }
   }
   // still here?!
   return ANSWER_WRONG;
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
   var next_question = this.get_next_question();
   if (next_question) {
      this.send_question(next_question);
   } else {
      var winner = this.get_winner();
      if (winner == null) {
	 // this means it was a tie!
	 this.send_to_all({message: 'It\'s a tie!'});
	 next_question = this.get_next_question();
	 this.send_question(next_question);
      } else {
	 winner.send({winner:{you_won:true}});
	 this.send_to_everyone_else(winner, {winner:{you_won:false}});
      }
   }
};

Battle.prototype.load_alternatives = function(participant) {
   /* load alternatives of the current question */
   this.loaded_alternatives.push(participant);
   var alts = this.database.get_alternatives(this.current_question);
   return alts;
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
