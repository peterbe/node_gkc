exports.L = function() {
   console.log.apply(console, arguments);
};

exports.parseUserCookie = function(cookie_str) {
   var m = cookie_str.match(/user_id=(\w+)/);
   if (m)
     return m[1];
   else
     return null;
};

exports.forEach = function(arr, callback) {
   for(var i=0, len=arr.length; i < len; i++) {
      callback(arr[i], i); 
   }
};