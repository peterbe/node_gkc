var scoreboard = (function() {
   var _player_names
     , _scores = {};
   return {
      init_players: function(player_names) {
	 _player_names = player_names;
	 for (var i in player_names) {
	    _scores[player_names[i]] = 0;
	 }
	 this._display();
      },
      drop_score: function(player_name) {
	 _scores[player_name] = -1;
	 this._display();
      },
      incr_score: function(player_name, points) {
	 _scores[player_name] += points;
	 this._display();
      },
      _display: function() {
	 $('#scoreboard').html('');
	 var name, score, container = $('<dl>');
	 for (var i in _player_names) {
	    score = _scores[_player_names[i]];
	    name = $('<dt>', {text: _player_names[i]}).appendTo(container);
	    if (_scores[_player_names[i]] >= 0) {
	       $('<dd>', {text: score}).appendTo(container);
	    } else {
	       $('<dd>', {text: 'disconnected'})
		 .addClass('disconnected')
		 .appendTo(container);
	       name.addClass('disconnected');
	    }
	 }
	 $('#scoreboard').append(container);
      }
   }
})();
