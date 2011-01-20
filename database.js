var L = require('./utils').L;

exports.Database = function() {
   var _questions = 
     [{id: 'q1',
	text: 'What year was Rolling Stones formed?',
	answer:'1962', 
	accept:['62'], 
	alternatives:['1958', '1962', '1969', '1974']
     },
      {id: 'q2',
	   text: 'What number is next in this sequence: 1, 2, 3, 4, ...?',
	   answer: '5', accept:[], alternatives:['5','7','9','13']
      }
     ];
   
   return {
      get_next_question: function(had) {
	 for (var i in _questions) {
	    if (!this._inArray(_questions[i], had)) {
	       return _questions[i];
	    }
	 }
      },
      get_answer: function(question) {
	 for (var i in _questions) {
	    if (_questions[i] == question) {
	       return {answer: _questions[i].answer,
		    accept: _questions[i].accept};
	    }
	 }
      },
      get_alternatives: function(question) {
	 for (var i in _questions) {
	    if (_questions[i].text == question) {
	       return _questions[i].alternatives;
	    }
	 }
      },
      _inArray: function(element, array) {
	 for (var i in array) {
	    if (array[i] == element) {
	       return true;
	    }
	 }
	 return false;
      }
   }
};



