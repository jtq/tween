'use strict';

var walker = require("../object-walker/index");

module.exports = {
	// Given a "from" object, a "to" object and a "progress" parameter (0 -> 1), calculate the values of the "from" object's properties at that point
	stateAt: function (from, to, progress) {

		var result = JSON.parse(JSON.stringify(from));	// Quick hacky object deep-clone

		walker.walk(from, function(val, path) {
			var diff = walker.get(to, path) - walker.get(from, path);
			var newval = walker.get(from, path) + (diff * progress);
			walker.set(result, path, newval);
		});

		return result;
	}
};