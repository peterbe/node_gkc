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

//app.get('/', function(req, res){ 
//   res.send('Hello World'); 
//});

app.get('/chat', function(req, res){ 
   res.render('chat.html');
});

app.listen(8888);
  
//var io = require('socket.io'); 
var socket = io.listen(app),
  buffer = [];
socket.on('connection', function(client){
   client.send({ buffer: buffer });
   client.broadcast({ announcement: client.sessionId + ' connected' });
   
   client.on('message', function(message){
      L('message', message);
      var msg = { message: [client.sessionId, message] };
      buffer.push(msg);
      if (buffer.length > 15) buffer.shift();
      L('msg', msg);
      client.broadcast(msg);
      L(buffer);
   });
   
   client.on('disconnect', function(){
      client.broadcast({ announcement: client.sessionId + ' disconnected' });
   });
});
