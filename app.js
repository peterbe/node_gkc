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
   var global_config = {};
   if (req.query.name) {
      global_config['user_name'] = req.query.name;
   }
   res.render('battle.html', {global_config:JSON.stringify(global_config)});
   //res.render('battle.html');
});

app.listen(8888);
  

var Battle = require('./battle').Battle;
var user_names = require('./user_names').user_names;


function assert(t) {
   if (!t) throw new Error("Assertion error");
}

var socket = io.listen(app)
  , battles = []
  , current_client_battles = {}
  , sessionid_names = {}
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
      //battle.send_to_all({news:"Ready to play!"});
      
      /*
      var player_names = [];
      for (var i in battle.participants) {
	 player_names.push(user_names.get(battle.participants[i].sessionId));
      }
      battle.send_to_all({init_scoreboard: player_names});
       */
      
      
      //var next_question = battle.get_next_question();
      //battle.send_question(next_question);
      battle.send_next_question();
      
   } else {
      battle.send_to_all({news:"Still waiting for more participants"});
   }
   
   battle.send_to_everyone_else(client, { announcement: user_names.get(client.sessionId) + ' connected' });
   
   client.on('message', function(message){
      L('Incoming message', message);
      if (message.answer) {
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_everyone_else(client, {message: user_names.get(client.sessionId) + ' answered something'});
	 if (battle.has_answered(client)) {
	    client.send({error:"Has already answered"});
	 } else {
	    battle.remember_has_answered(client);
	 }
	 if (battle.check_answer(message.answer)) {
	    var points = 3;
	    if (battle.has_alternatives(client)) {
	       points = 1;
	    }
	    battle.increment_score(client, points);
	    battle.send_to_all({update_scoreboard:[user_names.get(client.sessionId), points]});
	    client.send({answered:{right:true}});
	    battle.send_to_everyone_else(client, {answered: {right:false}});
	    battle.send_next_question();
	 } else if (battle.has_everyone_answered()) {
	    L("everyone has answered");
	    battle.send_to_all({answered: {right:false}});
	    battle.send_next_question();
	 }
      } else if (message.alternatives) {
	 var battle = current_client_battles[client.sessionId];
	 var alternatives = battle.load_alternatives(client);
	 battle.send_to_everyone_else(client, {message:user_names.get(client.sessionId) + ' loaded alternatives'});
	 client.send({alternatives:alternatives});
      } else if (message.timed_out) {
	 var battle = current_client_battles[client.sessionId];
	 battle.send_to_all({message:'Question timed out'});
	 battle.send_next_question();
	 //battle.close_current_question();
	 //var next_question = battle.get_next_question();
	 //battle.send_question(next_question);
      } else if (message.set_user_name) {
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
	 
      } else {
	 var msg = { message: [client.sessionId, message] };
	 L('msg', msg);
      }
   });
   
   client.on('disconnect', function(){
      var battle = current_client_battles[client.sessionId];
      battle.disconnect_participant(client);
      battle.send_to_all({update_scoreboard:[user_names.get(client.sessionId), -1]});
      //battle.send_to_all({message:client.sessionId + ' has disconnected'});
      battle.stop({message:user_names.get(client.sessionId) + ' has disconnected'});
      //L('Disconnected', client.sessionId); 
      //client.broadcast({ announcement: client.sessionId + ' disconnected' });
   });
});



