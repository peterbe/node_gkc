//var assert = require('assert');

var L = require('../utils').L;
var Battle = require('../battle').Battle;
var testCase = require('nodeunit').testCase;

var MockClient = function(sessionId) {
   this.sessionId = sessionId;
   this._sent_messages = [];
};

MockClient.prototype.send = function(msg) {
   this._sent_messages.push(msg);
};

module.exports = testCase({
   setUp: function(callback) {
      callback();
   },
   tearDown: function(callback) {
      callback();
   },
   test_basic_battle: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client);
      test.ok(battle.is_open(), 'must be open');
      var client2 = new MockClient('2');
      battle.add_participant(client2);
      test.ok(!battle.is_open(), 'max reached');
      test.done();
   },
   test_battle_winner: function(test) {
      // one winner
      var battle = new Battle();
      var client = new MockClient('111');
      battle.add_participant(client);
      var client2 = new MockClient('222');
      battle.add_participant(client2);
      
      battle.increment_score(client2, 1);
      battle.increment_score(client, 3);
      test.equal(battle.get_winner(), client);
      
      // a draw
      var battle = new Battle();
      var client = new MockClient('111');
      battle.add_participant(client);
      var client2 = new MockClient('222');
      battle.add_participant(client2);
      
      battle.increment_score(client2, 1);
      battle.increment_score(client, 1);
      test.ok(!battle.get_winner());
      
      // three people one winner
      var battle = new Battle({max_no_people:3});
      var client = new MockClient('111');
      var client2 = new MockClient('222');
      var client3 = new MockClient('333');
      battle.add_participant(client);
      battle.add_participant(client2);
      battle.add_participant(client3);
      
      battle.increment_score(client2, 1);
      battle.increment_score(client, 1);
      battle.increment_score(client2, 3);
      battle.increment_score(client3, 2);
      test.equal(battle.get_winner(), client2);
      test.done();
   },
   
   test_battle_sending: function(test) {
      var battle = new Battle();
      var client1 = new MockClient('1');
      var client2 = new MockClient('2');
      battle.add_participant(client1);
      battle.add_participant(client2);
      battle.send_to_everyone_else(client1, 'msg 1');
      test.equal(client1._sent_messages.length, 0);
      test.equal(client2._sent_messages.length, 1);
      battle.send_to_all('msg 2');
      test.equal(client1._sent_messages.length, 1);
      test.equal(client2._sent_messages.length, 2);
      test.done();
   },
   
   test_has_answered: function(test) {
      var battle = new Battle();
      var client = new MockClient('1');
      battle.add_participant(client);
      var client2 = new MockClient('2');
      battle.add_participant(client2);
      test.ok(!battle.has_everyone_answered());
      test.ok(!battle.has_answered(client));
      battle.remember_has_answered(client);
      test.ok(!battle.has_everyone_answered());
      test.ok(battle.has_answered(client));
      battle.remember_has_answered(client2);
      test.ok(battle.has_answered(client2));
      test.ok(battle.has_everyone_answered());
      test.done();      
   }
   
      
});			  
