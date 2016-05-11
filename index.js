'use strict';

var walker = require("../object-walker/index");

function stateAt(from, to, progress, objToModify) {

	var result = objToModify ? objToModify : JSON.parse(JSON.stringify(from));	// Quick hacky object deep-clone

	walker.walk(from, function(val, path) {
		var diff = walker.get(to, path) - walker.get(from, path);
		var newval = walker.get(from, path) + (diff * progress);
		walker.set(result, path, newval);
	});

	return result;
}

// Base class for tweeners
function BaseTweener(original, target, stepCallback) {
	this.from = JSON.parse(JSON.stringify(original));
	this.to = target;
	this.current = original;
	this.stepCallback = stepCallback;
}


function ManualTweener(original, target, steps, stepCallback) {
	BaseTweener.call(this, original, target, stepCallback);
	this.totalSteps = steps;
	this.progress = 0;
}
ManualTweener.prototype = Object.create(BaseTweener.prototype);
ManualTweener.prototype.constructor = ManualTweener;

// Update object according to the current elapsed time since start()
ManualTweener.prototype.step = function() {
	if(this.progress < this.totalSteps) {
		this.progress++;
		stateAt(this.from, this.to, this.progress/this.totalSteps, this.current);
	}
	else {
		stateAt(this.from, this.to, 1, this.current);
	}
	this.stepCallback.call(this, this.current);
};


// Base class for realtime tweeners, whose duration is set at startup and progress is elapsed time since the start.
// RealtimeRenderer does not auto-schedule steps - instead you must call step() manually whenever you want.
function RealtimeTweener(original, target, duration, stepCallback) {
	BaseTweener.call(this, original, target, stepCallback);
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
		stateAt(this.from, this.to, progress/this.duration, this.current);
		this.scheduleNext();
	}
	else {
		stateAt(this.from, this.to, 1, this.current);
	}
	this.stepCallback.call(this, this.current);
};

// Schedule next iteration of step()
RealtimeTweener.prototype.scheduleNext = function() {
};


// Realtime tweener that uses window.setTimeout() to generate a frequency of async steps
function TimeoutRealtimeTweener(original, target, duration, stepDelay, stepCallback) {
	RealtimeTweener.call(this, original, target, duration, stepCallback);
	this.timeoutDelay = stepDelay;
};
TimeoutRealtimeTweener.prototype = Object.create(RealtimeTweener.prototype);
TimeoutRealtimeTweener.prototype.constructor = TimeoutRealtimeTweener;

TimeoutRealtimeTweener.prototype.scheduleNext = function() {
	window.setTimeout(this.step.bind(this), this.timeoutDelay);
};


// Realtime tweener that uses window.requestAnimationFrame() to generate a lot of very smooth (~60fps) steps
function AnimationFrameRealtimeTweener(original, target, duration, stepCallback) {
	RealtimeTweener.call(this, original, target, duration, stepCallback);
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