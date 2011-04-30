var assert = require('assert'); // core node module
var L = require('../utils').L;
var Battle = require('../battle').Battle;
var models = require('../models');
var sch = require('../socket_client_handler');

var nodeunit = require('nodeunit');
var mongoose = require('mongoose');

var Fixtures = require('./testutils').Fixtures;
var MockClient = require('./testutils').MockClient;

var connection;
module.exports = nodeunit.testCase({
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
      return test.done();
      var user = new models.User();
      user.username = "peterbe";
      user.save(function(err) {
	 var client = new MockClient('1');
	 client.callbacks = {};
	 client.request = {};
	 client.request.headers = {}
	 client.request.headers.cookie = 'user_id='+ user._id;
	 client.on = function(eventname, callback) {
	    this.callbacks[eventname] = callback;
	 };
	 var no_battles = sch.battles.length;
	 var socket = sch.socket_client_handler(client);
	 setTimeout(function() {
	    assert.equal(sch.battles.length, no_battles + 1);
	    var current_battle = sch.current_client_battles[client.sessionId];
	    assert.ok(current_battle);
	    assert.ok(current_battle.options);
	    assert.ok(current_battle.is_open());
	    assert.equal(current_battle.participants.length, 1);
	    assert.equal(current_battle.user_ids.length, 1);
	    assert.equal(current_battle.user_ids[0], user._id);
	    delete sch.battles[0];
	    test.done();
	 }, 100);
      });
   },
   test_battle_start: function(test) {
      var user = new models.User();
      user.username = 'peter';
      user.save(function(err) {
	 assert.ok(!err);
	 var user2 = new models.User();
	 user2.username = 'ashley';
	 user2.save(function(err) {
	    assert.ok(!err);
	    
	    models.User.findOne({_id: user._id}, function (err, result) {
	       L("RES user1", result);
	    });
	    models.User.findOne({_id: user2._id}, function (err, result) {
	       L("RES user2", result);
	    });	    
	    
	    var client = new MockClient('100');
	    var client2 = new MockClient('200');
	    client.callbacks = {};
	    client.request = {};
	    client.request.headers = {}
	    client.request.headers.cookie = 'user_id='+ user._id;
	    client.on = function(eventname, callback) {
	       this.callbacks[eventname] = callback;
	    };
	    client2.callbacks = {};
	    client2.request = {};
	    client2.request.headers = {}
	    client2.request.headers.cookie = 'user_id='+ user2._id;
	    client2.on = function(eventname, callback) {
	       this.callbacks[eventname] = callback;
	    };
	    var no_battles = sch.battles.length;
	    //test.equal(sch.battles.length, 0);
	    var socket = sch.socket_client_handler(client);
	    var socket2 = sch.socket_client_handler(client2);
	    setTimeout(function() {
	       test.equal(sch.battles.length, no_battles + 1);
	       var current_battle = sch.current_client_battles[client.sessionId];
	       assert.equal(current_battle, 
			    sch.current_client_battles[client2.sessionId]);
	       assert.ok(current_battle);
	       assert.ok(current_battle.options);
	       assert.ok(current_battle.ready_to_play);
	       assert.ok(!current_battle.stopped);
	       assert.ok(!current_battle.is_open());
	       assert.equal(current_battle.sent_questions, 0);
	       assert.equal(current_battle.participants.length, 2);
	       assert.equal(current_battle.user_ids.length, 2);
	       
	       //assert.ok(client._sent_messages.your_name);
	       L(client._sent_messages);
	       L(client2._sent_messages);
	       delete sch.battles[0];
	       test.done();
	    }, 100);
	 });
      });
   }   
});
