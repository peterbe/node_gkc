var L = function() {
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


var question_handler = (function() {
   var _current_question
     , _initialized = false
     , _timer_clock
     , _timer_callback;
   
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
	 _current_question = question;
	 $('#wrong:visible').hide();
	 $('#alternatives input.alternative').remove();
	 $('#alternatives-outer:visible').hide();
	 $('#load-alternatives:hidden').show();
	 $('#answer').removeAttr('readonly').val('');
	 $('#question li.current').removeClass('current').addClass('past');
	 $('#question').append($('<li>', 
				 {text: question.text, id: question.id})
			       .addClass('current'));
	 //$('#question_id').val(data.question.id);
	 if (_timer_clock) {
	    clearTimeout(_timer_clock);
	 }
	 //L('_timer_clock', _timer_clock);
	 this.start_timer(this.timed_out);
	 $('#answer').focus();
      },
      timed_out: function() {
	 socket.send({timed_out:true});
      },
      finish: function(you_won) {
	 clearTimeout(_timer_clock);
	 $('#question li.current').removeClass('current').addClass('past');
	 if (you_won) {
	    $('#you_won').show();
	 } else {
	    $('#you_lost').show();
	 }
	 $('#timer').hide();
	 $('form#respond').fadeTo(900, 0.4);
      },
      start_timer: function(callback) {
	 _timer_callback = callback;
	 this.timer(300);
      },
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
      },
      answer: function(ans) {
	 socket.send({answer:ans});
	 $('#alternatives input.alternative').attr('readonly','readonly');
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
      socket.send({answer:$('#answer').val()});
      $('#answer').attr('readonly','readonly');
      return false;
   });
   $('#load-alternatives').click(function() {
      $('#answer').attr('readonly','readonly');
      alternatives.load();
   });
});

socket.on('message', function(obj){
   __log_message(obj);
   if (obj.question) {
      question_handler.load_question(obj.question);
   } else if (obj.winner) {
      question_handler.finish(obj.winner.you_won);
   } else if (obj.update_scoreboard) {
      scoreboard.incr_score(obj.update_scoreboard[0], obj.update_scoreboard[1]);
      scoreboard.display();
   } else if (obj.alternatives) {
      alternatives.show(obj.alternatives);
   } else if (obj.init_scoreboard) {
      scoreboard.init_players(obj.init_scoreboard);
      scoreboard.display();
   }
});
