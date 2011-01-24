/* battle play
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('../socket.io/')
  , express = require('../express')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , L = require('./utils').L;

var app = express.createServer();

app.configure(function(){
   app.use(express.methodOverride());
   app.use(express.bodyDecoder());
   app.use(app.router);
   app.use(express.staticProvider(__dirname + '/static'));
   
   app.set('views', __dirname + '/views');
   app.set('view engine', 'ejs');
   //app.set('view options', {layout: false});
   app.register('.html', require('ejs'));
   
});


app.configure('development', function(){ //default
   app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
   // $ NODE_ENV=production node app.js
   app.use(express.errorHandler());
});

//app.get('/chat', function(req, res){ 
//   res.render('chat.html');
//});

app.get('/battle', function(req, res){ 
   res.render('battle.html');
});

app.listen(8888);
  

var Battle = require('./battle').Battle;

function assert(t) {
   if (!t) throw new Error("Assertion error");
}

var socket = io.listen(app)
  , battles = []
  , current_client_battles = {}
;

socket.on('connection', function(client){

   var battle;
   for (var i in battles) {
      if (battles[i].is_open()) {
	 battle = battles[i];
	 break;
      }
   }
   if (!battle) {
      battle = new Battle();
      battles.push(battle);
   }
   battle.add_participant(client);
   current_client_battles[client.sessionId] = battle;

   if (battle.ready_to_play) {
      battle.send_to_all({news:"Ready to play!"});
      
      var player_names = [];
      for (var i in battle.participants) {
	 player_names.push(battle.participants[i].sessionId);
      }
      battle.send_to_all({init_scoreboard: player_names});
      var next_question = battle.get_next_question();
      battle.send_question(next_question);
   } else {
      battle.send_to_all({news:"Still waiting for more participants"});
   }
   
   battle.send_to_everyone_else(client, { announcement: client.sessionId + ' connected' });
   
   client.on('message', function(message){
      L('Incoming message', message);
      if (message.answer) {
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_everyone_else(client, {message: client.sessionId + ' answered something'});
	 if (battle.check_answer(message.answer)) {
	    var points = 3;
	    if (battle.has_alternatives(client)) {
	       points = 1;
	    }
	    battle.increment_score(client, points);
	    battle.send_to_all({update_scoreboard:[client.sessionId, points]});
	    battle.close_current_question();
	    battle.send_to_all({message:client.sessionId + ' got it RIGHT!'});
	    var next_question = battle.get_next_question();
	    if (next_question) {
	       battle.send_question(next_question);
	    } else {
	       var winner = battle.get_winner();
	       if (winner == null) {
		  // this means it was a tie!
		  battle.send_to_all({message: 'It\'s a tie!'});
		  next_question = battle.get_next_question();
		  battle.send_question(next_question);
	       } else {
		  winner.send({winner:{you_won:true}});
		  battle.send_to_everyone_else(winner, {winner:{you_won:false}});
	       }
	    }
	 } else {
	    battle.send_to_everyone_else(client, {message:client.sessionId + ' got it wrong'});
	 }
      } else if (message.alternatives) {
	 var battle = current_client_battles[client.sessionId];
	 var alternatives = battle.load_alternatives(client);
	 battle.send_to_everyone_else(client, {message:client.sessionId + ' loaded alternatives'});
	 client.send({alternatives:alternatives});
      } else if (message.timed_out) {
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_all({message:'Question timed out'});
	 battle.close_current_question();
	 var next_question = battle.get_next_question();
	 battle.send_question(next_question);
      } else {
	 var msg = { message: [client.sessionId, message] };
	 L('msg', msg);
      }
   });
   
   client.on('disconnect', function(){
      L('Disconnected', client.sessionId); 
      client.broadcast({ announcement: client.sessionId + ' disconnected' });
   });
});



