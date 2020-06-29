"use strict";
(function() {


function randI(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randB() {
	return Math.random() >= 0.5;
}

function rads(deg) {
	return deg * (Math.PI / 180);
}

//evironment parameters
var env = {
	ctx: null,
	frameID: 0,
	things: [],
	bgPattern: null,
	xcount : 10,
	ycount : 10,
	circleRadius : 25,
	circleGap : 25,
	lineThickness : 8,
	thingcount : 50,
	offset : 0,
	timescale : 0.5,
	fps: 0,
	fpslock: true,
};

// create background as a pattern to tile later
function createBG() {
	const backgroundCanvas = document.createElement("canvas");
	const context = backgroundCanvas.getContext("2d");
	const twoPi = 2 * Math.PI;
	const size = 2 * env.circleRadius + env.circleGap;
	backgroundCanvas.width = size;
	backgroundCanvas.height = size;
	context.fillStyle = "rgb(13,10,10)";
	context.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
	// cant offset background easily later so must draw 4 corners seperately

	// outer circles
	context.strokeStyle = "rgb(25,20,20)";
	context.lineWidth = env.lineThickness;
	if (context.lineWidth > env.circleRadius) context.lineWidth = env.circleRadius;
	context.beginPath();
	context.arc(0, 0, env.circleRadius, 0, twoPi, false);
	context.stroke();
	context.beginPath();
	context.arc(0, size, env.circleRadius, 0, twoPi, false);
	context.stroke();
	context.beginPath();
	context.arc(size, 0, env.circleRadius, 0, twoPi, false);
	context.stroke();
	context.beginPath();
	context.arc(size, size, env.circleRadius, 0, twoPi, false);
	context.stroke();

	// inner circles
	context.fillStyle = "rgb(18,15,15)";
	context.beginPath();
	context.arc(0, 0, env.circleRadius / 2, 0, twoPi, false);
	context.fill();
	context.beginPath();
	context.arc(0, size, env.circleRadius / 2, 0, twoPi, false);
	context.fill();
	context.beginPath();
	context.arc(size, 0, env.circleRadius / 2, 0, twoPi, false);
	context.fill();
	context.beginPath();
	context.arc(size, size, env.circleRadius / 2, 0, twoPi, false);
	context.fill();

	const bgPattern = env.ctx.createPattern(backgroundCanvas, "repeat");
	return bgPattern;
}

const ENUM_SEGMENT_ARC = 1;
const ENUM_SEGMENT_LINE = 2;

function createArcSegment(indexX, indexY, fromAngle, toAngle, cw) {
	// calculate exact coordinates
	const ax = indexX * (2 * env.circleRadius + env.circleGap);
	const ay = indexY * (2 * env.circleRadius + env.circleGap);

	return {
		type: ENUM_SEGMENT_ARC,
		x: ax,
		y: ay,
		indexX: indexX,
		indexY: indexY,
		fromAngle: fromAngle,
		angle: fromAngle,
		toAngle: toAngle,
		cw: cw
	};
}

function createLineSegment(fromIndexX, fromIndexY, toIndexX, toIndexY, fromAngle, toAngle, cw) {
	// calculate exact coordinates
	const fromX = fromIndexX * (2 * env.circleRadius + env.circleGap) + Math.cos(rads(fromAngle)) * env.circleRadius;
	const fromY = fromIndexY * (2 * env.circleRadius + env.circleGap) + Math.sin(rads(fromAngle)) * env.circleRadius;
	const toX = toIndexX * (2 * env.circleRadius + env.circleGap) + Math.cos(rads(toAngle)) * env.circleRadius;
	const toY = toIndexY * (2 * env.circleRadius + env.circleGap) + Math.sin(rads(toAngle)) * env.circleRadius;

	return {
		type: ENUM_SEGMENT_LINE,
		fromX: fromX,
		fromY: fromY,
		x: fromX,
		y: fromY,
		toX: toX,
		toY: toY,
		toAngle: toAngle,
		cw: cw,
		toIndexX: toIndexX,
		toIndexY: toIndexY
	};
}

// determine start/end offsets/angles for line movments
function lineJoin(angle, cw) {
	if (angle == null) {
		console.error("No angle?");
	}
	// clamp angles to normal range
	while (angle >= 360) angle = angle - 360;
	while (angle < 0) angle = angle + 360;

	let offsetX, offsetY;
	let newAngle = angle;

	// standard joins, rotation direction stays the same
	switch (angle) {
		case 0:   offsetX =  0; offsetY =  1; break;
		case 45:  offsetX = -1; offsetY =  1; break;
		case 90:  offsetX = -1; offsetY =  0; break;
		case 135: offsetX = -1; offsetY = -1; break;
		case 180: offsetX =  0; offsetY = -1; break;
		case 225: offsetX =  1; offsetY = -1; break;
		case 270: offsetX =  1; offsetY =  0; break;
		case 315: offsetX =  1; offsetY =  1; break;
	}
	// must flip offsets if counterclockwise
	if (!cw) {offsetX = -offsetX; offsetY = -offsetY;}

	// sometimes skip and join with non adjacent circles
	const distance = randI(1, 2);
	offsetX *= distance;
	offsetY *= distance;

	// flip joins, rotation direction changes (only with diagonals)
	let flipRotation = false;
	if (randB()) {
		if (cw) {
			switch (angle) {
				case 45:  offsetX =  0; offsetY =  1; newAngle = 225; flipRotation = true; break;
				case 135: offsetX = -1; offsetY =  0; newAngle = 315; flipRotation = true; break;
				case 225: offsetX =  0; offsetY = -1; newAngle =  45; flipRotation = true; break;
				case 315: offsetX =  1; offsetY =  0; newAngle = 135; flipRotation = true; break;
			}
		} else {
			switch (angle) {
				case 45:  offsetX =  1; offsetY =  0; newAngle = 225; flipRotation = true; break;
				case 135: offsetX =  0; offsetY =  1; newAngle = 315; flipRotation = true; break;
				case 225: offsetX = -1; offsetY =  0; newAngle =  45; flipRotation = true; break;
				case 315: offsetX =  0; offsetY = -1; newAngle = 135; flipRotation = true; break;
			}
		}
	}
	return {offsetX:offsetX, offsetY:offsetY, newAngle:newAngle, flipRotation:flipRotation};
}

// determine new segment action after line/arc movement
function addSegment(thing) {
	const frontSegment = thing.segments[0];
	if (frontSegment == null) {
		console.error("No things?");
	}

	// done arc around cirle, now add a line join
	if (frontSegment.type == ENUM_SEGMENT_ARC) {
		const lineEnd = lineJoin(frontSegment.toAngle, frontSegment.cw)
		let toIndexX = lineEnd.offsetX;
		let toIndexY = lineEnd.offsetY;

		// prevent line from moving off the screen
		if (toIndexX + frontSegment.indexX < 0
			|| toIndexX + frontSegment.indexX > env.xcount
			|| toIndexY + frontSegment.indexY < 0
			|| toIndexY + frontSegment.indexY > env.ycount
		) {
			if (toIndexX > 0) toIndexX = 1;
			if (toIndexY > 0) toIndexY = 1;
			if (toIndexX < 0) toIndexX = -1;
			if (toIndexY < 0) toIndexY = -1;
		}

		// apply the offset to current index
		toIndexX = frontSegment.indexX + toIndexX;
		toIndexY = frontSegment.indexY + toIndexY;

		// keep current orientation direction unless flipping
		const flipRotation = lineEnd.flipRotation;
		let cw = frontSegment.cw;
		if (flipRotation) {cw = !cw;}

		const fromIndexX = frontSegment.indexX;
		const fromIndexY = frontSegment.indexY;
		const fromAngle = frontSegment.toAngle;
		const toAngle = lineEnd.newAngle;

		const newSegment = createLineSegment(fromIndexX, fromIndexY, toIndexX, toIndexY, fromAngle, toAngle, cw);

		// add the new segment to the front
		thing.segments.unshift(newSegment);
		return;
	}

	// done joining as a line, now arc around a circle
	if (frontSegment.type == ENUM_SEGMENT_LINE) {
		let fromAngle = frontSegment.toAngle;
		while (fromAngle >= 360) fromAngle = fromAngle - 360;
		while (fromAngle < 0) fromAngle = fromAngle + 360;
		let toAngle = 45 * (randI(1,4));

		// wrap around at screen bounds
		if (frontSegment.toIndexX == 0
			|| frontSegment.toIndexX == env.xcount
			|| frontSegment.toIndexY == 0
			|| frontSegment.toIndexY == env.ycount
		) toAngle = 180;

		const cw = frontSegment.cw;
		if (cw) toAngle = fromAngle + toAngle;
		else toAngle = fromAngle - toAngle;
		const indexX = frontSegment.toIndexX;
		const indexY = frontSegment.toIndexY;

		const newSegment = createArcSegment(indexX, indexY, fromAngle, toAngle, cw);
		// add the new segment to the front
		thing.segments.unshift(newSegment);
		return;
	}
}

function removeSegment(thing) {
	thing.segments.pop();
}

function createThing(xIndex, yIndex) {
	const thing = {
		speed : 100 + randI(1, 40),
		endspeed : 10,
		segments : [],
		color : [randI(128, 255), randI(128, 255), randI(128, 255)],
	};
	// create initial segment (always an arc)
	const cw = randB();
	let fromAngle = 45 * randI(0,7);
	let toAngle = 45 * randI(1,4);
	if (cw) toAngle = fromAngle + toAngle;
	else toAngle = fromAngle - toAngle;
	thing.segments.push(createArcSegment(xIndex, yIndex, fromAngle, toAngle, cw));
	return thing;
}

function updateThing(thing, dt) {
	const ts = env.timescale;
	const speed = thing.speed;
	const endspeed = thing.endspeed;
	let addNewSegment = false;
	let removeEndSegment = false;

	if (thing.segments.length == 0) return;

	// move front segment
	let segment = thing.segments[0];
	if (segment.type == ENUM_SEGMENT_ARC) {
		if (segment.cw) {
			segment.angle = segment.angle + speed * dt * 4 * ts * ((1 / env.circleRadius) * 20);
			if (segment.angle > segment.toAngle) {segment.angle = segment.toAngle; addNewSegment = true;}
		}
		else {
			segment.angle = segment.angle - speed * dt * 4 * ts * ((1 / env.circleRadius) * 20);
			if (segment.angle < segment.toAngle) {segment.angle = segment.toAngle; addNewSegment = true;}
		}
	}
	else if (segment.type == ENUM_SEGMENT_LINE) {
		const dx = Math.abs(segment.fromX - segment.toX);
		const dy = Math.abs(segment.fromY - segment.toY);
		const sx = (dx == 0 || dy == 0) ? 1 : dx / dy;
		if (segment.toX > segment.fromX) {
			segment.x = segment.x + speed * dt * sx * ts;
			if (segment.x >= segment.toX) {segment.x = segment.toX; addNewSegment = true;}
		} else if (segment.toX < segment.fromX) {
			segment.x = segment.x - speed * dt * sx * ts;
			if (segment.x <= segment.toX) {segment.x = segment.toX; addNewSegment = true;}
		}

		if (segment.toY > segment.fromY) {
			segment.y = segment.y + speed * dt * 1 * ts;
			if (segment.y >= segment.toY) {segment.y = segment.toY; addNewSegment = true;}
		} else if (segment.toY < segment.fromY) {
			segment.y = segment.y - speed * dt * 1 * ts;
			if (segment.y <= segment.toY) {segment.y = segment.toY; addNewSegment = true;}
		}
	}

	// move end segment
	segment = thing.segments[thing.segments.length - 1];
	if (segment.type == ENUM_SEGMENT_ARC) {
		if (segment.cw) {
			segment.fromAngle = segment.fromAngle + endspeed * dt * 4 * ts * ((1 / env.circleRadius) * 20);
			if (segment.fromAngle > segment.angle) {removeEndSegment = true;}
		} else {
			segment.fromAngle = segment.fromAngle - endspeed * dt * 4 * ts * ((1 / env.circleRadius) * 20);
			if (segment.fromAngle < segment.angle) {removeEndSegment = true;}
		}
	}
	else if (segment.type == ENUM_SEGMENT_LINE) {
		const dx = Math.abs(segment.fromX - segment.toX);
		const dy = Math.abs(segment.fromY - segment.toY);
		const sx = (dx == 0 || dy == 0) ? 1 : dx / dy;
		if (segment.toX > segment.fromX) {
			segment.fromX = segment.fromX + endspeed * dt * sx * ts;
			if (segment.fromX >= segment.x) {removeEndSegment = true;}
		} else if (segment.toX < segment.fromX) {
			segment.fromX = segment.fromX - endspeed * dt * sx * ts;
			if (segment.fromX <= segment.x) {removeEndSegment = true;}
		}

		if (segment.toY > segment.fromY) {
			segment.fromY = segment.fromY + endspeed * dt * 1 * ts;
			if (segment.fromY >= segment.y) {removeEndSegment = true;}
		} else if (segment.toY < segment.fromY) {
			segment.fromY = segment.fromY - endspeed * dt * 1 * ts;
			if (segment.fromY <= segment.y) {removeEndSegment = true;}
		}
	}

	// if the front segment has reached its position, add another
	if (addNewSegment) addSegment(thing);
	// if the last segment has reached its position, remove it
	if (removeEndSegment) removeSegment(thing);

	// update speed of front and last segments
	thing.speed = thing.speed + 35 * dt * ts;
	if (thing.speed > 240) thing.speed = 200;
	thing.endspeed = thing.endspeed + 45 * dt * ts;
	if (thing.endspeed > 260) thing.endspeed = 240;
}

function drawThing(thing) {
	env.ctx.strokeStyle = "rgb(" + thing.color[0] + "," + thing.color[1] + "," + thing.color[2] + ")";
	env.ctx.beginPath();
	for (let i = 0, j = thing.segments.length; i < j; ++i) {
		const segment = thing.segments[i];
		if (segment.type == ENUM_SEGMENT_ARC) {
			env.ctx.moveTo(
				env.offset + segment.x + env.circleRadius * Math.cos(rads(segment.fromAngle)),
				env.offset + segment.y + env.circleRadius * Math.sin(rads(segment.fromAngle))
			);
			env.ctx.arc(env.offset + segment.x, env.offset + segment.y, env.circleRadius, rads(segment.fromAngle), rads(segment.angle), !segment.cw);
		} else if (segment.type == ENUM_SEGMENT_LINE) {
			env.ctx.moveTo(env.offset + segment.fromX, env.offset + segment.fromY);
			env.ctx.lineTo(env.offset + segment.x, env.offset + segment.y);
		}
	}
	env.ctx.stroke();
}
function update(dt) {
	//limit large dt
	//if (dt > 1) dt = 0;
	//position things
	for (let i = 0; i < env.things.length; ++i) {
		updateThing(env.things[i], dt);
	}

	//slowly add more things
	if (env.things.length < env.thingcount) {
		if (randI(1, 10) == 10) {
			env.things.push(createThing(randI(1, env.xcount - 0), randI(1, env.ycount - 0)));
		}
	}

	//remove finished things
	for (let i = 0; i < env.things.length; ++i) {
		if (env.things[i].segments.length == 0) {
			env.things.splice(i, 1);
		}
	}
}

function draw() {
	// fill the background pattern
	env.ctx.fillStyle = env.bgPattern;
	env.ctx.fillRect(0, 0, env.ctx.canvas.width, env.ctx.canvas.height);

	// draw the lines
	env.ctx.lineWidth = env.lineThickness;
	if (env.ctx.lineWidth > env.circleRadius) env.ctx.lineWidth = env.circleRadius;
	env.ctx.lineCap = "round";
	for (let i = 0; i < env.things.length; ++i) {
		drawThing(env.things[i]);
	}

	//debug info onscreen
	if (false) {
		env.ctx.font = "12px sans-serif";
		env.ctx.fillStyle = "rgb(100,100,100)";
		env.ctx.textBaseline = "top";
		env.ctx.fillText("Things: " + env.things.length + "/" + env.thingcount, 10, 10);
		env.ctx.fillText("FPS: " + env.fps, 10, 25);
		env.ctx.fillText("env: " + JSON.stringify(env, null, 2), 10, 40);
	}
}

function setupContext() {
	//create container
	const container = document.createElement("div");
	container.style.width = "100%";
	container.style.height = "100%";
	container.style.position = "relative";
	container.id = "linesdemo";
	//create canvas
	const canvas = document.createElement("canvas");
	canvas.style.width = "100%";
	canvas.style.height = "100%";
	canvas.style.backgroundColor = "rgb(13,10,10)";
	canvas.mozOpaque = true;
	container.appendChild(canvas);
	//insert at position
	const scripts = document.getElementsByTagName("script")
	const script = scripts[scripts.length - 1];
	script.parentNode.insertBefore(container,script);
	//set size
	const rect = canvas.getBoundingClientRect();
	canvas.width = rect.width;
	canvas.height = rect.height;
	const ctx = canvas.getContext("2d", {alpha: false});
	window.addEventListener("resize", onResize, false);
	env.ctx = ctx;
}

function onResize() {
	const rect = env.ctx.canvas.getBoundingClientRect();
	env.ctx.canvas.width = rect.width;
	env.ctx.canvas.height = rect.height;
	env.xcount = Math.ceil(env.ctx.canvas.width / (2 * env.circleRadius + env.circleGap)) - 1;
	env.ycount = Math.ceil(env.ctx.canvas.height / (2 * env.circleRadius + env.circleGap)) - 1;
	env.offset = 0;
	env.bgPattern = createBG();
}

function startAnimation() {
	onResize();
	let last = performance.now() / 1000;
	let fpsThreshold = 0;
	env.frameID = window.requestAnimationFrame(onAnimationFrame);

	function onAnimationFrame() {
		env.frameID = window.requestAnimationFrame(onAnimationFrame);

		const now = performance.now() / 1000;
		const dt = Math.min(now - last, 1);
		last = now;

		// fps limit
		if (env.fps > 0 && env.fpslock) {
			fpsThreshold += dt;
			if (fpsThreshold < 1.0 / env.fps) {
				return;
			}
			fpsThreshold -= 1.0 / env.fps;
		}

		update(dt);
		draw();
	}
}

function stopAnimation() {
	window.cancelAnimationFrame(env.frameID);
}

//wallpaper engine events
window.wallpaperPropertyListener = {
	applyUserProperties: function(properties) {
		if (properties.linecount) {
			env.thingcount = properties.linecount.value;
			while (env.things.length > env.thingcount) {
				env.things.pop();
			}
		}
		if (properties.linethick) {
			env.lineThickness = properties.linethick.value;
			env.bgPattern = createBG();
		}
		if (properties.circleradius) {
			env.circleRadius = properties.circleradius.value;
			env.circleGap = properties.circleradius.value;
			onResize();
			//FIXME line segment absolute positions are cached so must be cleared
			while (env.things.length > 0) {
				env.things.pop();
			}
		}
		if (properties.playbackrate) {
			env.timescale = properties.playbackrate.value / 100.0;
		}
		if (properties.fpslock) {
			env.fpslock = properties.fpslock.value;
		}
	},
	applyGeneralProperties: function(properties) {
		if (properties.fps) {
			env.fps = properties.fps;
		}
	}
};
setupContext();
startAnimation();
})();
