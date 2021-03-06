'use strict';

var walker = require("@jtq/object-walker");

function stateAt(from, to, duration, progress, easingFunction, objToModify) {

	var result = objToModify ? objToModify : JSON.parse(JSON.stringify(from));	// Quick hacky object deep-clone if we aren't modifying an object in-place

	easingFunction = easingFunction || function(start, end, duration, progress) {
		var range = end - start;
		return range*progress/duration + start;
	};

	walker.walk(from, function(val, path) {
		var newval = easingFunction(walker.get(from, path), walker.get(to, path), duration, progress);
		walker.set(result, path, newval);
	});

	return result;
}

// Base class for tweeners
function BaseTweener(original, target, easingFunction, stepCallback) {
	this.from = JSON.parse(JSON.stringify(original));
	this.to = target;
	this.current = original;

	// Default easing function is a simple linear ease (hardcoded to avoid unnecessary dependency on easing-functions.js)
	this.easingFunction = easingFunction;
	this.stepCallback = stepCallback || function(){};
}


function ManualTweener(original, target, steps, easingFunction, stepCallback) {
	BaseTweener.call(this, original, target, easingFunction, stepCallback);
	this.totalSteps = steps;
	this.progress = 0;
}
ManualTweener.prototype = Object.create(BaseTweener.prototype);
ManualTweener.prototype.constructor = ManualTweener;

// Update object according to the current elapsed time since start()
ManualTweener.prototype.step = function() {
	if(this.progress < this.totalSteps) {
		this.progress++;
		stateAt(this.from, this.to, this.totalSteps, this.progress, this.easingFunction, this.current);
	}
	else {
		stateAt(this.from, this.to, this.totalSteps, this.totalSteps, this.easingFunction, this.current);
	}
	this.stepCallback.call(this, this.current);
};


// Base class for realtime tweeners, whose duration is set at startup and progress is elapsed time since the start.
// RealtimeRenderer does not auto-schedule steps - instead you must call step() manually whenever you want.
function RealtimeTweener(original, target, duration, easingFunction, stepCallback) {
	BaseTweener.call(this, original, target, easingFunction, stepCallback);
	this.duration = duration;
	this.startTime = null;
}
RealtimeTweener.prototype = Object.create(BaseTweener.prototype);
RealtimeTweener.prototype.constructor = RealtimeTweener;

// Start realtime tween
RealtimeTweener.prototype.start = function() {
	this.startTime = Date.now();
	this.scheduleNext();
};

// Update object according to the current elapsed time since start()
RealtimeTweener.prototype.step = function() {
	var now = Date.now();
	var progress = now - this.startTime;
	if(progress < this.duration) {
		stateAt(this.from, this.to, this.duration, progress, this.easingFunction, this.current);
		this.scheduleNext();
	}
	else {
		stateAt(this.from, this.to, this.duration, this.duration, this.easingFunction, this.current);
	}
	this.stepCallback.call(this, this.current);
};

// Schedule next iteration of step()
RealtimeTweener.prototype.scheduleNext = function() {
};


// Realtime tweener that uses window.setTimeout() to generate a frequency of async steps
function TimeoutRealtimeTweener(original, target, duration, stepDelay, easingFunction, stepCallback) {
	RealtimeTweener.call(this, original, target, duration, easingFunction, stepCallback);
	this.timeoutDelay = stepDelay;
};
TimeoutRealtimeTweener.prototype = Object.create(RealtimeTweener.prototype);
TimeoutRealtimeTweener.prototype.constructor = TimeoutRealtimeTweener;

TimeoutRealtimeTweener.prototype.scheduleNext = function() {
	window.setTimeout(this.step.bind(this), this.timeoutDelay);
};


// Realtime tweener that uses window.requestAnimationFrame() to generate a lot of very smooth (~60fps) steps
function AnimationFrameRealtimeTweener(original, target, duration, easingFunction, stepCallback) {
	RealtimeTweener.call(this, original, target, duration, easingFunction, stepCallback);
};
AnimationFrameRealtimeTweener.prototype = Object.create(RealtimeTweener.prototype);
AnimationFrameRealtimeTweener.prototype.constructor = AnimationFrameRealtimeTweener;

AnimationFrameRealtimeTweener.prototype.scheduleNext = function() {
	window.requestAnimationFrame(this.step.bind(this));
};


module.exports = {
	// Given a "from" object, a "to" object and a "progress" parameter (0 -> 1), calculate the values of the "from" object's properties at that point
	stateAt: stateAt,

	BaseTweener: BaseTweener,

	ManualTweener: ManualTweener,

	RealtimeTweener: RealtimeTweener,
	TimeoutRealtimeTweener: TimeoutRealtimeTweener,
	AnimationFrameRealtimeTweener: AnimationFrameRealtimeTweener
};