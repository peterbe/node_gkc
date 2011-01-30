exports.user_names = (function() {
   var _names = {};
   return {
      get: function(id) {
	 var name = _names[id];
	 if (!name) return id;
	 return name;
      },
      set: function(id, name) {
	 _names[id] = name;
      },
      has: function(id) {
	 return _names[id] !== undefined;
      }
   }
})();
