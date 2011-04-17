var L = function() {
   if (window.console && window.console.log)
     console.log.apply(console, arguments);
};

function message(obj){
   var el = document.createElement('p');
   if ('announcement' in obj) el.innerHTML = '<em>' + esc(obj.announcement) + '</em>';
   else if ('message' in obj) el.innerHTML = '<b>' + esc(obj.message[0]) + ':</b> ' + esc(obj.message[1]);
   document.getElementById('chat').appendChild(el);
   document.getElementById('chat').scrollTop = 1000000;
}

function send(){
   var val = document.getElementById('text').value;
   socket.send(val);
   message({ message: ['you', val] });
   document.getElementById('text').value = '';
}

function esc(msg){
   return msg.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

var Clock = (function () {
   var _clock
     , _callback
     , _init_seconds;
   return {
      stop: function () {
	 clearTimeout(_clock);
      },
      start: function (seconds, callback) {
	 Rumbler.stop();
	 _init_seconds = seconds;
	 Clock.tick(seconds);
	 _callback = callback;
      },
      tick: function (seconds) {
	 $('#timer').text(seconds);
	 if (seconds > 0) {
	    _clock = setTimeout(function() {
	       Clock.tick(seconds - 1);
	    }, 1000);
	    var p = parseInt(100 * seconds / _init_seconds);
	    // p is percentage of time left
	    // max rumble speed is 200 (quite arbitrary)
	    var rumbleSpeed;
	    if (p < 30) {
	       rumbleSpeed = 1 * p;
	       var range;
	       if      (p < 1) range = 6;
	       else if (p < 5) range = 4;
	       else if (p < 10) range = 3;
	       else    range = 2;
	       Rumbler.start($('#timer'), rumbleSpeed, range)
	    }
	 } else {
	    _callback();
	 }
      }
   }
})();


var question_handler = (function() {
   var _current_question
     , _initialized = false
     , _timer_callback
     , _has_answered = false;
   
   return {
      initialize: function() {
	 $('#respond').show();
	 $('#waiting').hide();
	 _initialized = true;
      },
      load_question: function(question) {
	 if (!_initialized) {
	    this.initialize();
	 }
	 _has_answered = false;
	 _current_question = question;
	 $('#wrong:visible').hide();
	 $('#alternatives input.alternative').remove();
	 $('#alternatives-outer:visible').hide();
	 $('#load-alternatives:hidden').show();
	 $('#typed:hidden').show();
	 $('#answer').removeAttr('readonly').removeAttr('disabled').val('');
	 $('#question li.current').removeClass('current').addClass('past');
	 $('#question').append($('<li>', {id: question.id}
				).addClass('current')
			      .append($('<span>', {text: question.text})));
	 $('#alternatives').fadeTo(0, 1.0);
	 //$('#question_id').val(data.question.id);
	 
	 Clock.stop();
	 Clock.start(30, this.timed_out);
	 //if (_timer_clock) {
	 //   clearTimeout(_timer_clock);
	 //}
	 //L('_timer_clock', _timer_clock);
	 //this.start_timer(this.timed_out);
	 $('#answer').focus();
	 
	 // check if an image was loaded to the previous question
	 if (!$('img', $('li.past').eq(-1)).size()) {
	    $('li.past').eq(-1)
	      .append($('<img>', {src:'/images/hourglass.png',
		alt:'Timed out'
	      }));
	 }
      },
      timed_out: function() {
	 $('#question li.current').addClass('past');
	 $('#answer').removeAttr('readonly');
	 
	 $('li.current')
	   .append($('<img>', {src:'/images/hourglass.png',
		alt:'Timed out'
	   }));
	 socket.send({timed_out:true});
      },
      finish: function(you_won, draw) {
	 question_handler.stop();
	 draw = draw || false;
	 $('#question li.current').removeClass('current').addClass('past');
	 if (draw) {
	    $('#you_drew').show()
	      .append($('<a>', {
		 href:Global.HOMEPAGE_URL,
		   text:"Go back to the home page"}));

	 } else {
	    if (you_won) {
	       $('#you_won').show()
		 .append($('<a>', {
		 href:Global.HIGHSCORE_URL,
		      text:"Check out where you are now on the Highscore list"}));

	    } else {
	       $('#you_lost').show()
		 .append($('<a>', {
		    href:Global.HOMEPAGE_URL,
		      text:"Go back to the home page"}));
		 
	    }
	 }
      },
      stop: function(information) {
	 Clock.stop();
	 
	 //$('#question li.current').removeClass('current').addClass('past');
	 $('#timer').hide();
	 $('form#respond').fadeTo(900, 0.4);
	 if (information && information.message) {
	    $('#information p').text(information.message);
	    $('#information').show();
	 }
      },
      //start_timer: function(callback) {
      //  _timer_callback = callback;
      // this.timer(30);
      //},
      /*
      timer: function(seconds) {
	 $('#timer').text(seconds);
	 if (seconds > 0) {
	    _timer_clock = setTimeout(function() {
	       question_handler.timer(seconds - 1);
	    }, 1000);
	 } else {
	    $('#question li.current').addClass('past');
	    $('#answer').removeAttr('readonly');
	    //alert("Time's up!");
	    _timer_callback();
	 }
      },
       */
      right_answer: function() {
	 $('li.current')
	   .append($('<img>', {src:'/images/right.png',
		alt:'Yay! you got it right'
	   }));
	         
      },
      wrong_answer: function() {
	 $('li.current')
	   .append($('<img>', {src:'/images/wrong.png',
		alt:'Sorry. You got it wrong'
	   }));
      },
      send_answer: function(answer) {
	 $('#answer').attr('readonly','readonly').attr('disabled','disabled');
	 socket.send({answer:answer});
	 _has_answered = true;
      },
      has_sent_answer: function() {
	 return _has_answered;
      }
   }
})();

var alternatives = (function() {
   return {
      load: function() {
	 $('#load-alternatives').hide();
	 socket.send({alternatives:true});
      },
      show: function(alts) {
	 var container = $('#alternatives');
	 for (var i in alts) {
	    container.append($('<input>', {name:'alternative', type:'button', value:alts[i]})
			     .addClass('alternative')
			     .click(function() {
				alternatives.answer(this.value);
			     }));
	 }
	 $('#alternatives-outer').show();
	 $('#typed:visible').hide();
      },
      answer: function(ans) {
	 socket.send({answer:ans});
	 $('#alternatives input.alternative')
	   .attr('readonly','readonly')
	     .attr('disable','disable')
	       .unbind('click');
	 $('#alternatives').fadeTo(300, 0.4);
      }
   }
})();

function __log_message(msg) {
   var el = document.createElement('p');
   var d = new Date();
   var line = '<em>' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds() + '</em> ';
   if ('object' == typeof msg) {
      line += JSON.stringify(msg);
   } else {
      line += msg;
   }
   el.innerHTML = line;
   document.getElementById('log').appendChild(el);
   document.getElementById('log').scrollTop = 1000000;
}

var socket = new io.Socket(null, {port: 8888, rememberTransport: false});
socket.connect();

socket.on('connect', function() {
   $('form#respond').submit(function() {
      var answer = $.trim($('#answer').val());
      if (!answer.length || question_handler.has_sent_answer()) {
	 return false;
      }
      question_handler.send_answer(answer);
      return false;
   });
   $('#load-alternatives').click(function() {
      $('#answer').attr('readonly','readonly').attr('disabled','disabled');
      alternatives.load();
   });
});

socket.on('message', function(obj){
   __log_message(obj);
   if (obj.question) {
      question_handler.load_question(obj.question);
      $('#your_name:visible').hide();
   } else if (obj.winner) {
      if (obj.winner.draw) {
	 question_handler.finish(null, true);
      } else {
	 question_handler.finish(obj.winner.you_won);
      }
   } else if (obj.update_scoreboard) {
      if (-1 == obj.update_scoreboard[1]) {
	 scoreboard.drop_score(obj.update_scoreboard[0]);
      } else {
	 scoreboard.incr_score(obj.update_scoreboard[0], obj.update_scoreboard[1]);
      }
   } else if (obj.alternatives) {
      alternatives.show(obj.alternatives);
   } else if (obj.init_scoreboard) {
      scoreboard.init_players(obj.init_scoreboard);
   } else if (obj.stop) {
      question_handler.stop(obj.stop);
   } else if (obj.answered) {
      if (obj.answered.right) {
	 question_handler.right_answer();
      } else {
	 question_handler.wrong_answer();
      }
   } else if (obj.error) {
      question_handler.stop();
      alert("Error!\n" + obj.error);
   } else if (obj.your_name) {
      // this is mainly for checking that all is working fine
      $('#your_name strong').text(obj.your_name);
      $('#your_name:hidden').show(500);
   }
});

