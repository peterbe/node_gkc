require.paths.unshift('support/mongoose/lib');
var L = require('./utils').L
  , mongoose = require('mongoose')
;



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
   // faked DBRefs
   , genre : {}
   , author : {}
});

var GenreSchema = new mongoose.Schema({
   name     : String
});
mongoose.model('Genre', GenreSchema);
var Genre = mongoose.model('Genre', 'question_genres');

QuestionSchema.method({
   findAuthor: function(callback) {
      User.findOne({_id:this.doc.author.oid}, function(err, r) {
	 callback(err, r);
      });
   },
   findGenre:function(callback) {
      Genre.findOne({_id:this.doc.genre.oid}, function(err, r) {
	 callback(err, r);
      });      
   }
});

mongoose.model('Question', QuestionSchema);
var Question = mongoose.model('Question', 'questions');

var QuestionAnsweredSchema = new mongoose.Schema({
   question_id:     mongoose.Schema.ObjectId
   , user_id:       mongoose.Schema.ObjectId
   , right:         Boolean
   , answer:        String
});
mongoose.model('QuestionAnswered', QuestionAnsweredSchema);
var QuestionAnswered = mongoose.model('QuestionAnswered', 'question_answered');

var BattleSchema = new mongoose.Schema({
   users: [mongoose.Schema.ObjectId]
   , started: { type: Date, default: Date.now }
   , finished: Date
   , no_players: { type: Number, default: 0 }
   , no_questions: Number
   , draw: { type: Boolean, default: false }
   , winner: mongoose.Schema.ObjectId
});
mongoose.model('Battle', BattleSchema);
var Battle = mongoose.model('Battle', 'battles');

var BattledQuestionsSchema = new mongoose.Schema({
   battle: mongoose.Schema.ObjectId
   , question: { type: mongoose.Schema.ObjectId, index: true }
   , user: { type: mongoose.Schema.ObjectId, index: true }
   , loaded_alternatives: { type: Boolean, default: false }
   , right: { type: Boolean, default: false }
   , timed_out: { type: Boolean, default: false }
   , timestamp: { type: Date, default: Date.now }
});
mongoose.model('BattledQuestion', BattledQuestionsSchema);
var BattledQuestion = mongoose.model('BattledQuestion', 'battled_questions');

/*
console.log("Once?");
Question.count({state:'PUBLISHED'}, function(err, count) {
   console.log("There are " + count + " published questions in the database");
});
console.log('once after');
*/


/*
Question.find({state:'PUBLISHED'}, function(err, docs) {
   docs.forEach(function(each) {
      each.findAuthor(function(err, u) {
	 L("U", u.doc.username);
      });
      //each.findGenre(function(err, u) {
      //L("G", u.doc.name);
      //});      
   });
});
 */



exports.Question = Question;
exports.User = User;
exports.Genre = Genre;
exports.Battle = Battle;
exports.BattledQuestion = BattledQuestion;
exports.QuestionAnswered = QuestionAnswered;

