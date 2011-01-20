var L=function() {
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
   var current_question;
   
   return {
      load_question: function(question) {
	 current_question = question;
	 $('#wrong:visible').hide();
	 $('#answer').removeAttr('readonly').val('');
	 //T = meta.time;
	 $('#question li.current').removeClass('current').addClass('past');
	 $('#question').append($('<li></li>')
			       .text(question)
			       .addClass('current'));
	 //$('#question_id').val(data.question.id);
	 this.timer(140);
	 $('#answer').focus();
      },
      timer: function(seconds) {
	 $('#timer').text(seconds);
	 if (seconds > 0) {
	    setTimeout(function() {
	       question_handler.timer(seconds - 1);
	    }, 1000);
	 } else {
	    alert("Time's up!");
	    $('#question li.current').addClass('past');
	    $('#answer').removeAttr('readonly');
	 }
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
   L('setting up form')
   $('form#respond').submit(function() {
      socket.send({answer:$('#answer').val()});
      $('#answer').attr('readonly','readonly');
      return false;
   });
});

socket.on('message', function(obj){
   __log_message(obj);
   if (obj.question) {
      question_handler.load_question(obj.question);
   } else if (obj.finished) {
      question_handler.finish(obj.finished);
   }
});
