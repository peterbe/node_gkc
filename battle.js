var L = require('./utils').L;

var Database = require('./database').Database;

var options = require('../socket.io/lib/socket.io/utils').options
    , merge = require('../socket.io/lib/socket.io/utils').merge;

var database = Database();

var Battle = function(options) {
   //this.id = id;
   this.options(merge({
      min_no_people: 2,
      max_no_people: 2,
      no_questions: 10
   }, {}), options);
   this.participants = [];
   this.ready_to_play = false;
   this.sent_questions = [];
   // implementing it as an array because as a hash table I can't use any 
   // object as the key
   this.scores = [];
};

Battle.prototype.save = function() {
   L("Save the current state to the database");
};

Battle.prototype.send_to_all = function(msg) {
   for (var i in this.participants) {
      this.participants[i].send(msg);
   }
};

Battle.prototype.is_open = function() {
   return this.participants.length < this.options.min_no_people;
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

Battle.prototype.get_next_question = function() {
   if (!this.current_question) {
      var x = database.get_next_question(this.sent_questions);
      //L("X", x);
      this.current_question = x;
   }
   return this.current_question;
};

Battle.prototype.check_answer = function(answer) {
   L('In check_answer current_question=', this.current_question);
   var answer_obj = database.get_answer(this.current_question);
   L('answer_obj', answer_obj);
   if (answer_obj.answer.toLowerCase() == answer.toLowerCase()) {
      return true;
   }
   for (var i in answer_obj.accept) {
      if (answer_obj.accept[i].toLowerCase() == answer.toLowerCase()) {
	 return true;
      }
   }
   return false;
};

Battle.prototype.close_question = function() {
   this.sent_questions.push(this.current_question);
   this.current_question = null;
};

Battle.prototype.increment_score = function(participant, score) {
   // because this.scores is a list we have to loop to find where to 
   // update the array
   var _participant, _score;
   //L('BEFORE', this.scores);
   for (var i in this.scores) {
      _participant = this.scores[i][0];
      if (_participant == participant) {
	 _score = this.scores[i][1];
	 this.scores[i] = [participant, _score + score];
      }
   }
   //L('AFTER', this.scores);
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

for (var i in options) {
   Battle.prototype[i] = options[i];
}

exports.Battle = Battle;