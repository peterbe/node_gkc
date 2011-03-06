var L = require('../utils').L;
var testCase = require('nodeunit').testCase;
var models = require('../models');
var mongoose = require('mongoose');

var connection = mongoose.connect('mongodb://localhost/test-gkc', function(err) {
   if (err) throw new Error(err.message);
});

module.exports = testCase({
   setUp: function(callback) {
      models.User.remove({}, function(err, stuff) {
	 models.Question.remove({}, function(err) {
	    callback();
	 });
      });
   },
   tearDown: function(callback) {
      callback();
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
	 question.author = {'oid':user};
	 question.save(function(err) {
	    question.findAuthor(function(err, u) {
	       L(u);
	       test.done();
	    });
	 });
      });      
   }
});

