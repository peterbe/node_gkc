/**
 * Important note: this application is not suitable for benchmarks!
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

app.get('/chat', function(req, res){ 
   res.render('chat.html');
});

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
	 client.broadcast({log: 'Adding to existing battle'});
	 break;
      }
   }
   if (!battle) {
      battle = new Battle();
      client.broadcast({log: 'Created new battle'});
      battles.push(battle);
   }
   battle.add_participant(client);
   current_client_battles[client.sessionId] = battle;

   if (battle.ready_to_play) {
      battle.send_to_all({news:"Ready to play!"});
      var next_question = battle.get_next_question();
      battle.send_to_all({question:{text: next_question.text, id:next_question.id}});
   } else {
      battle.send_to_all({news:"Still waiting for more participants"});
   }
   
   battle.send_to_everyone_else(client, { announcement: client.sessionId + ' connected' });
   
   client.on('message', function(message){
      L('message', message);
      if (message.answer) {
	 battle.send_to_everyone_else({message: client.sessionId + ' answered something'});
	 //client.broadcast({message: client.sessionId + ' answered something'});
	 var battle = current_client_battles[client.sessionId];
	 if (battle.check_answer(message.answer)) {
	    battle.increment_score(client, 3);
	    battle.close_question();
	    client.broadcast({message:client.sessionId + ' got it RIGHT!'});
	    var next_question = battle.get_next_question();
	    L("Next question IS:", next_question);
	    if (next_question) {
	       battle.send_to_all({question:next_question.text});
	    } else {
	       battle.send_to_all({finished:{winner: battle.get_winner()}});
	    }
	 } else {
	    battle.send_to_everyone_else(client, {message:client.sessionId + ' got it wrong'});
	    //client.broadcast({message:client.sessionId + ' got it wrong'});
	 }
      } else {
	 var msg = { message: [client.sessionId, message] };
	 L('msg', msg);
	 client.broadcast(msg);
      }
   });
   
   client.on('disconnect', function(){
      L('Disconnected', client.sessionId); 
      client.broadcast({ announcement: client.sessionId + ' disconnected' });
   });
});



