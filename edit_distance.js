// (c) Peter Bengtsson, 2010, mail@peterbe.com
//
var L = require('./utils').L;

exports.EditDistanceMatcher = function(against, alphabet) {
   this.against = against;
   this.alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";

   this.edits1 = function(word) {
      var n = word.length;
      var al = this.alphabet.length;
      var set = new Array(), t;
      // deletion
      for (var i=0, len=n; i < len; i++) {
         t = word.substring(0, i) + word.substring(i+1, n);
	 if (-1 == set.indexOf(t))
	   set.push(t);
      }
      // transposition
      for (var i=0, len=n - 1; i < len; i++) {
         t = word.substring(0, i) + word.substr(i+1, 1) + word.substr(i, 1) +  word.substring(i+2, n);
	 if (-1 == set.indexOf(t))
	   set.push(t);
      }
      // alteration
      for (var i=0, len=n; i < len; i++) {
         for (var j=0, leny=al; j<leny; j++) {
            t = word.substring(0, i) + this.alphabet.substr(j,1) + word.substring(i+1, n);
	    if (-1 == set.indexOf(t))
	      set.push(t);
         }
      }
      // insertion
      for (var i=0, len=n + 1; i < len; i++) {
         for (var j=0, leny=al; j<leny; j++) {
            t = word.substring(0, i) + this.alphabet.substr(j,1) + word.substring(i, n);
	    if (-1 == set.indexOf(t))
	      set.push(t);
         }
      }
      return set;
   };
};
exports.EditDistanceMatcher.prototype.match = function(word) {
   var edits1 = this.edits1(word);
   var set = new Array();

   for (var i in edits1) {
      if (-1 < this.against.indexOf(edits1[i])) {
	 if (-1 == set.indexOf(edits1[i]))
	   set.push(edits1[i]);
      }
   }
   return set;
}

exports.EditDistanceMatcher.prototype.is_matched = function(word) {
   var edits1 = this.edits1(word);
   for (var i in edits1) {
      if (-1 < this.against.indexOf(edits1[i])) {
         return true;
      }
   }
   return false;
}
