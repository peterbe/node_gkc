/* battle play
 */


// I don't like these. I'd rather depend on npm
require.paths.unshift('support/express/lib');
require.paths.unshift('support/express/support/ejs/lib');

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , express = require('express')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , utils = require('./utils')
  , models = require('./models');
var L = utils.L;


var app = express.createServer();

app.configure(function(){
   app.use(express.methodOverride());
   app.use(express.bodyParser());
   app.use(app.router);
   app.use(express.static(__dirname + '/static'));

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

require.paths.unshift('support/mongoose/lib');
var mongoose = require('mongoose');
var connection = mongoose.connect('mongodb://localhost/gkc', function(err) {
   if (err) {
      throw new Error(err.message);
   }
});

app.get('/', function(req, res){
   res.send("All is working fine");
   //res.render('battle.html', {global_config:JSON.stringify(global_config)});
});

app.get('/play', function(req, res){
   var global_config = {
      'HIGHSCORE_URL':'http://kwissle.com/highscore/',
      'HOMEPAGE_URL':'http://kwissle.com/',
   };
   res.render('battle.html', {
      global_config:JSON.stringify(global_config)
   });
});

app.get('/start', function(req, res){
   if (req.query.u) {
      models.User.findOne({_id: req.query.u}, function(err, result) {
	 if (err) {
	    res.render('not_logged_in.html', {error:"Not found in database"});
	 } else {
	    res.cookie('user_id', req.query.u);
	    res.redirect('/play');
	 }
      });
   } else {
      res.render('not_logged_in.html', {error:"No cookie"})
   }
});

app.listen(8888);




//function assert(t) {
//   if (!t) throw new Error("Assertion error");
//}

var socket = io.listen(app);

var sch = require('./socket_client_handler');
socket.on('connection', sch.socket_client_handler);
