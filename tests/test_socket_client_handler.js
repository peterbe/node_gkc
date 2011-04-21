var L = require('../utils').L;
var Battle = require('../battle').Battle;
var models = require('../models');
var sch = require('../socket_client_handler');

var testCase = require('nodeunit').testCase;
var mongoose = require('mongoose');

var Fixtures = require('./testutils').Fixtures;
var MockClient = require('./testutils').MockClient;

var connection;
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
   test_basic_setting_up: function(test) {
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var client = new MockClient('1');
	 client.callbacks = {};
	 client.request = {};
	 client.request.headers = {}
	 client.request.headers.cookie = 'user_id='+ user._id;
	 L('client.request.headers.cookie', client.request.headers.cookie);
	 client.on = function(eventname, callback) {
	    this.callbacks[eventname] = callback;
	 };
	 test.equal(sch.battles.length, 0);
	 //L('before',sch.battles);
	 var socket = sch.socket_client_handler(client);
	 setTimeout(function() {
	    //L('after', sch.battles);
	    test.equal(sch.battles.length, 1);
	    L(sch.current_client_battles);
	    client.callbacks.message({timed_out:true});
	    test.done();
	 }, 100);
      });
   }
});
