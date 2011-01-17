/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('../socket.io/')
  , express = require('../express')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;


var L=function() {
   console.log.apply(console, arguments);
};

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
  

var options = require('../socket.io/lib/socket.io/utils').options
    , merge = require('../socket.io/lib/socket.io/utils').merge;



var Database = require('./database').Database;
var database = Database();

var Battle = function(id, options) {
   this.id = id;
   this.options(merge({
      min_no_people: 2,
      max_no_people: 2
   }, {}), options);
   this.participants = [];
   this.ready_to_play = false;
   this.sent_questions = [];
};
Battle.prototype.save = function() {
   L("Save the current state to the database");
};
Battle.prototype.send_to_all = function(msg) {
   for (var i in this.participants) {
      this.participants[i].send(msg);
   }
};
Battle.prototype.is_open = function() {
   return this.participants.length < this.options.min_no_people;
};
Battle.prototype.add_participant = function(participant) {
   if (this.participants.length >= this.options.max_no_people) {
      throw new Error('Battle full');
   }
   this.participants.push(participant);
   if (this.participants.length >= this.options.min_no_people) {
      this.ready_to_play = true;
   }
};
Battle.prototype.get_next_question = function() {
   if (!this.current_question) {
      var x = database.get_next_question(this.sent_questions);
      //L("X", x);
      this.current_question = x;
   }
   return this.current_question;
};
Battle.prototype.check_answer = function(answer) {
   L('In check_answer current_question=', this.current_question);
   var answer_obj = database.get_answer(this.current_question);
   L('answer_obj', answer_obj);
   if (answer_obj.answer.toLowerCase() == answer.toLowerCase()) {
      return true;
   }
   for (var i in answer_obj.accept) {
      if (answer_obj.accept[i].toLowerCase() == answer.toLowerCase()) {
	 return true;
      }
   }
   
   return false;
};
Battle.prototype.close_question = function() {
   this.sent_questions.push(this.current_question);
   this.current_question = null;
};

for (var i in options) {
   Battle.prototype[i] = options[i];
}

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
      battle = new Battle();L('created new battle object');
      client.broadcast({log: 'Created new battle'});
      battles.push(battle);
   }
   battle.add_participant(client);
   current_client_battles[client.sessionId] = battle;

   if (battle.ready_to_play) {
      battle.send_to_all({news:"Ready to play!"});
      //L("SEND", {question:battle.get_next_question().text});
      battle.send_to_all({question:battle.get_next_question().text});
   } else {
      battle.send_to_all({news:"Still waiting for more participants"});
   }
   
   //client.send({ buffer: [] });
   client.broadcast({ announcement: client.sessionId + ' connected' });
   
   client.on('message', function(message){
      L('message', message);
      if (message.answer) {
	 L('Answer', message.answer);
	 client.broadcast({message: client.sessionId + ' answered something'});
	 //L('battles', battles);
	 //L('current_client_battles', current_client_battles, current_client_battles[client.sessionId]);
	 var battle = current_client_battles[client.sessionId];
	 if (battle.check_answer(message.answer)) {
	    battle.close_question();
	    client.broadcast({message:client.sessionId + ' got it RIGHT!'});
	    battle.send_to_all({question:battle.get_next_question().text});
	 } else {
	    client.broadcast({message:client.sessionId + ' got it wrong'});
	 }
      } else {
	 var msg = { message: [client.sessionId, message] };
	 //buffer.push(msg);
	 //if (buffer.length > 15) buffer.shift();
	 L('msg', msg);
	 client.broadcast(msg);
      }
   });
   
   client.on('disconnect', function(){
      L('Disconnected', client.sessionId); 
      client.broadcast({ announcement: client.sessionId + ' disconnected' });
   });
});



