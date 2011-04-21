var utils = require('./utils')
  , battles = []
  , current_client_battles = {}
  , L = utils.L
;

var Battle = require('./battle').Battle;
var user_names = require('./user_names').user_names;

exports.socket_client_handler = function(client){
   L("Client connected");
   client.send({debug:"Connected!"});

   if (!client.request) {
      // this seems to happen if you have a lingering xhr-poll
      L("No request object on the client. Exiting");
      return;
   }

   var user_id;
   if (client.request.headers.cookie)
     user_id = utils.parseUserCookie(client.request.headers.cookie);
   if (!user_id) {
      L("Not logged in");
      client.send({error: "Not logged in"});
      return;
   }

   var battle;
   for (var i in battles) {
      if (battles[i].is_open()) {
	 battle = battles[i];
	 break;
      }
   }
   if (!battle) {
      L("Creating new Battle instance");
      battle = new Battle();
      battles.push(battle);
   }

   battle.add_participant(client, user_id, function() {
      current_client_battles[client.sessionId] = battle;

      battle.fetch_user_name(user_id, function(err, name) {
	 client.send({your_name:name});
	 user_names.set(client.sessionId, name);

	 battle.send_to_everyone_else(client, { announcement: user_names.get(client.sessionId) + ' connected' });

	 if (battle.ready_to_play) {
	    var player_names = [];
	    battle.participants.forEach(function(participant) {
	       player_names.push(user_names.get(participant.sessionId));
	    });
	    battle.send_to_all({init_scoreboard: player_names});
	    battle.send_next_question(function() {
	       // pass
	    });
	 } else {
	    battle.send_to_all({news:"Still waiting for more participants"});
	 }
      });
   });


   client.on('message', function(message){
      L('Incoming message', message);
      if (message.answer) {
	 // XXX Possible concurrency problem
	 // This can probably be easily solved with a simple "lock file" pattern.
	 // If two people send in their answers 1 millisecond after each other
	 // the "slow" battle.check_answer() might take 3 milliseconds to respond
	 // and if the first one got it right, he will get the score and it will
	 // send out a new question so when the second person reaches the
	 // battle.check_answer() the curren_question will be nullified potentially
	 // and the whole check_answer() will barf.
	 // If the first person to reach battle.check_answer() gets it wrong, the
	 // answer of the second person should now be attempted.
	 // So, before calling battle.check_answer() we'll need something like
	 // battle.queue_answer(client, message.answer)
	 // and at the end of the check_answer() callback (if the answer was wrong),
	 // pop the next answer off the queue and check that too until the queue is
	 // empty to someone has answered correctly.
	 // Also, if the first person is right and the second person's answer is
	 // in the queue, we'll need to send to everyone in the queue that they
	 // were wrong.
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_everyone_else(client, {message: user_names.get(client.sessionId) + ' answered something'});
	 if (battle.has_answered(client)) {
	    client.send({error:"Has already answered"});
	 } else {
	    battle.remember_has_answered(client);
	 }
	 battle.check_answer(message.answer, function(err, got_it_right) {
	    if (err) {
	       throw new Error(err);
	    }
	    if (got_it_right) {
	       var points = 3;
	       if (battle.has_alternatives(client)) {
		  points = 1;
	       }
	       battle.increment_score(client, points);
	       battle.send_to_all({update_scoreboard:[user_names.get(client.sessionId), points]});
	       client.send({answered:{right:true}});
	       battle.send_to_everyone_else(client, {answered: {right:false}});
	       battle.close_current_question(function() {
		  battle.send_next_question();
	       });
	    } else if (battle.has_everyone_answered()) {
	       L("everyone has answered");
	       battle.send_to_all({answered: {right:false}});
	       battle.close_current_question(function() {
		  battle.send_next_question();
	       });
	    }
	 });
      } else if (message.alternatives) {
	 var battle = current_client_battles[client.sessionId];
	 battle.load_alternatives(client, function(err, alternatives) {
	    battle.send_to_everyone_else(client,
					 {message:user_names.get(client.sessionId) + ' loaded alternatives'});
	    client.send({alternatives:alternatives});
	 });
      } else if (message.timed_out) {
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_all({message:'Question timed out'});
	 battle.close_current_question(function() {
	    battle.send_next_question();
	 });
      } else if (message.set_user_name) {
	 /* OUT
	 throw new Error("This is obsolete and should be taken care of by the database and the user_id");
	 user_names.set(client.sessionId, message.set_user_name);
	 // if we have all the names, initialize the score board
	 var battle = current_client_battles[client.sessionId];
	 if (battle.ready_to_play) {
	    var player_names = [];
	    for (var i in battle.participants) {
	       player_names.push(user_names.get(battle.participants[i].sessionId));
	    }
	    battle.send_to_all({init_scoreboard: player_names});
	 }
	 */
      } else {
	 var msg = { message: [client.sessionId, message] };
	 L('msg', msg);
      }
   });

   client.on('disconnect', function(){
      var battle = current_client_battles[client.sessionId];
      battle.disconnect_participant(client);
      battle.send_to_all({update_scoreboard:[user_names.get(client.sessionId), -1]});
      battle.stop({message:user_names.get(client.sessionId) + ' has disconnected'});
      delete user_names[client.sessionId];
   });
};

// the reason these are exported is so that I can inspect them and test them
// in a unit test. At the moment I know no other way.
exports.battles = battles;
exports.current_client_battles = current_client_battles;