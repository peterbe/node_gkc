var assert = require('assert');

var L = require('../utils').L;
var Battle = require('../battle').Battle;

function test_battle() {
   var MockClient = function(sessionId) {
      this.sessionId = sessionId;
      this._sent_messages = [];
   };
   MockClient.prototype.send = function(msg) {
      this._sent_messages.push(msg);
   };
   
   var battle = new Battle();
   var client = new MockClient('1');
   battle.add_participant(client);
   assert.ok(battle.is_open(), 'must be open');
   var client2 = new MockClient('2');
   battle.add_participant(client);
   assert.ok(!battle.is_open(), 'max reached');
   
   
}


test_battle();

function test_battle_winner() {
   var MockClient = function(sessionId) {
      this.sessionId = sessionId;
      this._sent_messages = [];
   };
   MockClient.prototype.send = function(msg) {
      this._sent_messages.push(msg);
   };
   
   // one winner
   var battle = new Battle();
   var client = new MockClient('111');
   battle.add_participant(client);
   var client2 = new MockClient('222');
   battle.add_participant(client2);
   
   battle.increment_score(client2, 1);
   battle.increment_score(client, 3);
   assert.equal(battle.get_winner(), client);

   // a draw
   var battle = new Battle();
   var client = new MockClient('111');
   battle.add_participant(client);
   var client2 = new MockClient('222');
   battle.add_participant(client2);
   
   battle.increment_score(client2, 1);
   battle.increment_score(client, 1);
   assert.ok(!battle.get_winner());

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
   assert.equal(battle.get_winner(), client2);
}

test_battle_winner();