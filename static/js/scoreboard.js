var scoreboard = (function() {
   var _player_names
     , _scores = {};
   return {
      init_players: function(player_names) {
	 _player_names = player_names;
	 for (var i in player_names) {
	    _scores[player_names[i]] = 0;
	 }
      },
      incr_score: function(player_name, points) {
	 _scores[player_name] += points;
      },
      display: function() {
	 $('#scoreboard').html('');
	 var container = $('<dl>');
	 for (var i in _player_names) {
	    $('<dt>', {text: _player_names[i]}).appendTo(container);
	    $('<dd>', {text: _scores[_player_names[i]]}).appendTo(container);
	 }
	 $('#scoreboard').append(container);
      }
   }
})();
