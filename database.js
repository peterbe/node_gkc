require.paths.unshift('support/mongoose/lib');
var L = require('./utils').L
  , mongoose = require('mongoose')
;


var connection = mongoose.connect('mongodb://localhost/gkc', function(err) {
   if (err) {
      throw new Error(err.message);
   }
});


var UserSchema = new mongoose.Schema({
   username: String
   , first_name: String
   , last_name: String
   , email: String
});
mongoose.model('User', UserSchema);
var User = mongoose.model('User', 'users');

var QuestionSchema = new mongoose.Schema({
   text     : String
   , answer      : String
   , accept      : [String]
   , alternatives      : [String]
   , spell_correct      : Boolean
   , state      : String
   , publish_date      : Date
//   , author : mongoose.Schema.ObjectId // has to be commented out otherwise 
});

QuestionSchema.method({
   findAuthor: function(callback) {
      User.findOne({_id:this.doc.author.oid}, function(err, r) {
	 if (err) {
	    throw new Error(err);
	 }
	 callback(r);
      });
   }
});

mongoose.model('Question', QuestionSchema);
var Question = mongoose.model('Question', 'questions');

var QuestionsAnsweredSchema = new mongoose.Schema({
   question_id:     mongoose.Schema.ObjectId
   , user_id:       mongoose.Schema.ObjectId
   , right:      Boolean
   , answer:     String
});

//User.count({}, function(err, count) {
//   console.log(count);
//});

User.find({}, function(err, docs) {
   docs.forEach(function(each) {
      L(each.email);
   });
});

Question.find(function(err, docs) {
   docs.forEach(function(each) {
      L(each.doc.author);
      L(each.findAuthor(function(user) {
	 L("user", user.first_name);
      }));
   });
});

Question.count({state:'PUBLISHED'}, function(err, count) {
   L("THere are " + count + " published questions in the database");
});

/*
exports.Database = function() {
   var _questions =
     [{id: 'q1',
	text: 'What year was Rolling Stones formed?',
	answer:'1962',
	accept:['62'],
	alternatives:['1958', '1962', '1969', '1974'],
	genre: 'Entertainment', spell_correct:false
     },
      {id: 'q2',
	   text: 'What number is next in this sequence: 1, 2, 3, 4, ...?',
	   answer: '5', accept:[], alternatives:['5','7','9','13'],
	   genre: 'Mathematics', spell_correct:false
      },
      {id: 'q3',
	   text: 'What is the capital of France?',
	   answer: 'Paris', accept:[], alternatives:['Paris','Berlin','Brussels','Stockholm'],
	   genre: 'Geography', spell_correct:true
      },
      {id: 'q4',
	   text: 'What is 12 divided by 2 times 3?',
	   answer: '18', accept:[], alternatives:['12','16','18','24'],
	   genre: 'Mathematics', spell_correct:false
      },
      {id: 'q5',
	   text: 'What country is Budapest the capital of?',
	   answer: 'Hungary', accept:[], alternatives:['Hungary','Germany','Estonia','Sweden'],
	   genre: 'Geography', spell_correct:true
      },
      {id: 'q6',
	   text: 'What is 11 * 101?',
	   answer: '1111', accept:[], alternatives:['1101','1011','1111','1110'],
	   genre: 'Mathematics', spell_correct:false
      },
      {id: 'q7',
	   text: 'How many bytes are there in one kilobyte?',
	   answer: '1024', accept:[], alternatives:['124','512','1000','1024'],
	   genre: 'Science', spell_correct:false
      }
     ];

   return {
      get_next_question: function(user_ids, callback) {
	 for (var i in _questions) {
	    if (!this._inArray(_questions[i], had)) {
	       callback(_questions[i]);
	       break;
	    }
	 }
      },
      get_answer: function(question) {
	 for (var i in _questions) {
	    if (_questions[i] == question) {
	       return {answer: _questions[i].answer,
		    accept: _questions[i].accept,
                    spell_correct: _questions[i].spell_correct};
	    }
	 }
      },
      get_alternatives: function(question, callback) {
	 for (var i in _questions) {
	    if (_questions[i] == question) {
	       callback(null, _questions[i].alternatives);
	    }
	 }
      },
      _inArray: function(element, array) {
	 for (var i in array) {
	    if (array[i] == element) {
	       return true;
	    }
	 }
	 return false;
      }
   }
};
*/
