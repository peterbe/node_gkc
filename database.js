var L = require('./utils').L;

exports.Database = function() {
   var _questions = 
     [{id: 'q1',
	text: 'What year was Rolling Stones formed?',
	answer:'1962', 
	accept:['62'],
	alternatives:['1958', '1962', '1969', '1974'],
	genre: 'Entertainment'
     },
      {id: 'q2',
	   text: 'What number is next in this sequence: 1, 2, 3, 4, ...?',
	   answer: '5', accept:[], alternatives:['5','7','9','13'], 
	   genre: 'Mathematics'
      },
      {id: 'q3',
	   text: 'What is the capital of France?',
	   answer: 'Paris', accept:[], alternatives:['Paris','Berlin','Brussels','Stockholm'],
	   genre: 'Geography'
      },
      {id: 'q4',
	   text: 'What is 12 divided by 2 times 3?',
	   answer: '18', accept:[], alternatives:['12','16','18','24'],
	   genre: 'Mathematics'
      },
      {id: 'q5',
	   text: 'What country is Budapest the capital of?',
	   answer: 'Hungary', accept:[], alternatives:['Hungary','Germany','Estonia','Sweden'],
	   genre: 'Geography'
      },
      {id: 'q6',
	   text: 'What is 11 * 101?',
	   answer: '1111', accept:[], alternatives:['1101','1011','1111','1110'],
	   genre: 'Mathematics'
      },
      {id: 'q7',
	   text: 'How many bytes are there in one kilobyte?',
	   answer: '1024', accept:[], alternatives:['124','512','1000','1024'],
	   genre: 'Science'
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



