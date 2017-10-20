(function() {
"use strict";
//create container
var container = document.createElement("div");
container.style.width="100%";
container.style.height="100%";
container.style.position="relative";
container.id = "linesdemo";
//create canvas
var canvas = document.createElement("canvas");
canvas.style.width="100%";
canvas.style.height="100%";
canvas.style.backgroundColor = "rgb(13,10,10)";
canvas.mozOpaque = true;
container.appendChild(canvas);
//insert at position
var scripts = document.getElementsByTagName('script')
var script = scripts[scripts.length-1];
script.parentNode.insertBefore(container,script);
//set size
canvas.width = canvas.getBoundingClientRect().width;
canvas.height = canvas.getBoundingClientRect().height;
var ctx = canvas.getContext("2d");
window.addEventListener('resize',function(){figuresize();},false);

function randI(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randB() {
	return Math.random() >= 0.5;
}

function rads(deg) {
	return deg*(Math.PI/180);
}

//evironment parameters
var env = {
	xcount : 10,
	ycount : 10,
	cradius : 25,
	cgap : 25,
	thickness : 8,
	thingcount : 50,
	offset : 0,
	timescale : 0.5,
	fps: 0,
	fpslock: true,
};
//array of things
var things = [];

var bgpattern;

function createBG()
{
	var bgcanvas = document.createElement('canvas');
	var bgctx = bgcanvas.getContext('2d');
	var pi = Math.PI;
	bgcanvas.width = 2*env.cradius+env.cgap;
	bgcanvas.height = 2*env.cradius+env.cgap;
	bgctx.fillStyle = 'rgb(13,10,10)';	
	bgctx.fillRect(0,0,bgcanvas.width,bgcanvas.height);
	//cant offset bg later so must create 4 corners seperately
	var p = 2*env.cradius+env.cgap;
	bgctx.strokeStyle='rgb(25,20,20)';
	bgctx.lineWidth = env.thickness;
	if (bgctx.lineWidth > env.cradius) bgctx.lineWidth = env.cradius;
	bgctx.beginPath();
	bgctx.arc(0,0,env.cradius,2*pi,false);
	bgctx.stroke();
	bgctx.beginPath();
	bgctx.arc(0,p,env.cradius,0,2*pi,false);
	bgctx.stroke();
	bgctx.beginPath();
	bgctx.arc(p,0,env.cradius,0,2*pi,false);
	bgctx.stroke();
	bgctx.beginPath();
	bgctx.arc(p,p,env.cradius,0,2*pi,false);
	bgctx.stroke();
	bgctx.fillStyle='rgb(18,15,15)';
	bgctx.beginPath();
	bgctx.arc(0,0,env.cradius/2,0,2*pi,false);
	bgctx.fill();
	bgctx.beginPath();
	bgctx.arc(0,p,env.cradius/2,0,2*pi,false);
	bgctx.fill();
	bgctx.beginPath();
	bgctx.arc(p,0,env.cradius/2,0,2*pi,false);
	bgctx.fill();
	bgctx.beginPath();
	bgctx.arc(p,p,env.cradius/2,0,2*pi,false);
	bgctx.fill();
	var bgp = ctx.createPattern(bgcanvas, 'repeat');
	return bgp;
}

function createCSeg(thisx, thisy, thisd, cw, dend)
{
	return {
		typ : 1,
		x : thisx, //circle x
		y : thisy, // cricle y
		d : thisd, //current deg
		ds : thisd, //starting deg
		cw : cw, //clockwise?
		dend : dend //where deg to stop
	};
}

function createLSeg(fromx, fromy, fromd, tox, toy, tod, tocw, tonx, tony)
{
	return {
		typ : 2,
		fromx : fromx,
		fromy : fromy,
		fromd : fromd,
		tox : tox,
		toy : toy,
		tod : tod,
		x : fromx,
		y : fromy,
		tocw : tocw,
		tonx : tonx,
		tony : tony
	};
}

function gowhere(r, cw)
{
	if (r==null) {
		console.error("No angle?");
	}
	while (r >= 360) r = r - 360;
	while (r < 0) r = r + 360;

	var ox, oy;
	var newr = r;
	var dist= randI(1,2);

	// standard joins
	if (r == 0) {ox = 0; oy = 1;}
	else if (r == 45) {ox = -1; oy = 1;}
	else if (r == 90) {ox = -1; oy = 0;}
	else if (r == 135) {ox = -1; oy = -1;}
	else if (r == 180) {ox = 0; oy = -1;}
	else if (r == 225) {ox = 1; oy = -1;}
	else if (r == 270) {ox = 1; oy = 0;}
	else if (r == 315) {ox = 1; oy = 1;}
	if (!cw) {ox = -ox; oy = -oy;}
	ox = ox * dist;
	oy = oy * dist;

	var flip = false;
	if (randB())
	{
		if (r == 45 && cw) {ox = 0; oy = 1; newr = 225; flip=true;}
		else if (r == 135 && cw) {ox = -1; oy = 0; newr = 315; flip=true;}
		else if (r == 225 && cw) {ox = 0; oy = -1; newr = 45; flip=true;}
		else if (r == 315 && cw) {ox = 1; oy = 0; newr = 135; flip=true;}
		else if (r == 45 && !cw) {ox = 1; oy = 0; newr = 225; flip=true;}
		else if (r == 135 && !cw) {ox = 0; oy = 1; newr = 315; flip=true;}
		else if (r == 225 && !cw) {ox = -1; oy = 0; newr = 45; flip=true;}
		else if (r == 315 && !cw) {ox = 0; oy = -1; newr = 135; flip=true;}
	}
	return {ox:ox, oy:oy, newr:newr, flip:flip};
}

function addSegment(thing)
{
	var newpart;
	var top = thing.parts[0];
	if (top==null) {console.error("No things?");}
	if (top.typ == 1)
	{
		//currently a cirle, lets add a line
		var cx = top.x*(2*env.cradius+env.cgap) + Math.cos(rads(top.dend))*env.cradius;
		var cy = top.y*(2*env.cradius+env.cgap) + Math.sin(rads(top.dend))*env.cradius;
		var cd = top.dend;
		var nx, ny, newd, flip;
		var gw = gowhere(cd, top.cw)
		nx = gw.ox;
		ny = gw.oy;
		newd = gw.newr;
		flip = gw.flip;
		if (nx+top.x < 0 || nx+top.x > env.xcount || ny+top.y < 0 || ny+top.y > env.ycount)
		{
			if (nx > 0) nx = 1;
			if (ny > 0) ny = 1;
			if (nx < 0) nx = -1;
			if (ny < 0) ny = -1;
		}
		nx = top.x + nx;
		ny = top.y + ny;
		var tocw = top.cw;
		if (flip) {tocw = !tocw;}

		var pnx = nx*(2*env.cradius+env.cgap) + Math.cos(rads(newd))*env.cradius;
		var pny = ny*(2*env.cradius+env.cgap) + Math.sin(rads(newd))*env.cradius;
		newpart = createLSeg(cx, cy, cd, pnx, pny, newd, tocw, nx, ny);
		thing.parts.unshift(newpart);
		return;
	}
	if (top.typ == 2)
	{
		//currently a line, lets add a circle
		var dstart = top.tod;
		while (dstart >= 360) dstart = dstart - 360;
		while (dstart < 0) dstart = dstart + 360;
		var nextd = 45*(randI(1,4));
		// wrap around at bounds
		if (top.tonx==0 || top.tonx==env.xcount || top.tony==0 || top.tony==env.ycount) nextd = 45*4;
		var cw = top.tocw;
		if (cw) nextd = dstart + nextd;
		if (!cw) nextd = dstart - nextd;
		newpart = createCSeg(top.tonx, top.tony, dstart, cw, nextd);
		thing.parts.unshift(newpart)
		return;
	}
}

function removeSegment(thing)
{
	thing.parts.pop();
}

function createThing(startx, starty)
{
	var thing = {
		speed : 100 + randI(1,40),
		endspeed : 10,
		parts : [],
		color : [randI(128,255), randI(128,255), randI(128,255)],
	};
	// create initial segment
	var cw = randB();
	var startd = 45*randI(0,7);
	var nextd = 45*randI(1,4);
	if (cw) nextd = startd + nextd;
	if (!cw) nextd = startd - nextd;
	thing.parts.push(createCSeg(startx, starty, startd, cw, nextd));
	return thing;
}

function updateThing(thing, dt)
{
	var ts = env.timescale;
	var speed = thing.speed;
	var endspeed = thing.endspeed;
	var newSegment = false;
	var endSegment = false;

	if (thing.parts.length == 0) return;
	//front part
	var part = thing.parts[0];
	if (part.typ == 1)
	{
		if (part.cw)
		{
			part.d = part.d + speed*dt*4*ts*((1/env.cradius)*20);
			if (part.d > part.dend) {part.d = part.dend; newSegment = true;}
		}
		else
		{
			part.d = part.d - speed*dt*4*ts*((1/env.cradius)*20);
			if (part.d < part.dend) {part.d = part.dend; newSegment = true;}
		}
	}
	else if (part.typ == 2)
	{
		var dx = Math.abs(part.fromx-part.tox);
		var dy = Math.abs(part.fromy-part.toy);
		var sx = dx/dy;
		if (dx == 0 || dy == 0) sx = 1;
		if (part.tox > part.fromx)
		{
			part.x = part.x + speed*dt*sx*ts;
			if (part.x >= part.tox) {part.x = part.tox; newSegment = true;}
		}
		else if (part.tox < part.fromx)
		{
			part.x = part.x - speed*dt*sx*ts;
			if (part.x <= part.tox) {part.x = part.tox; newSegment = true;}
		}

		if (part.toy > part.fromy)
		{
			part.y = part.y + speed*dt*1*ts;
			if (part.y >= part.toy) {part.y = part.toy; newSegment = true;}
		}
		else if (part.toy < part.fromy)
		{
			part.y = part.y - speed*dt*1*ts;
			if (part.y <= part.toy) {part.y = part.toy; newSegment = true;}
		}
	}
	//tail part
	part = thing.parts[thing.parts.length-1];
	if (part.typ == 1)
	{
		if (part.cw)
		{
			part.ds = part.ds + endspeed*dt*4*ts*((1/env.cradius)*20);
			if (part.ds > part.d) {endSegment = true;}
		}
		else
		{
			part.ds = part.ds - endspeed*dt*4*ts*((1/env.cradius)*20);
			if (part.ds < part.d) {endSegment = true;}
		}
	}
	else if (part.typ == 2)
	{
		var dx = Math.abs(part.fromx-part.tox);
		var dy = Math.abs(part.fromy-part.toy);
		var sx = dx/dy;
		if (dx == 0 || dy == 0) sx = 1;
		if (part.tox > part.fromx)
		{
			part.fromx = part.fromx + endspeed*dt*sx*ts;
			if (part.fromx >= part.x) {endSegment = true;}
		}
		else if (part.tox < part.fromx)
		{
			part.fromx = part.fromx - endspeed*dt*sx*ts;
			if (part.fromx <= part.x) {endSegment = true;}
		}

		if (part.toy > part.fromy)
		{
			part.fromy = part.fromy + endspeed*dt*1*ts;
			if (part.fromy >= part.y) {endSegment = true;}
		}
		else if (part.toy < part.fromy)
		{
			part.fromy = part.fromy - endspeed*dt*1*ts;
			if (part.fromy <= part.y) {endSegment = true;}
		}
	}
	if (newSegment) addSegment(thing);
	if (endSegment) removeSegment(thing);
	thing.speed = thing.speed + 35*dt*ts;
	if (thing.speed > 240) thing.speed = 200;
	thing.endspeed = thing.endspeed + 45*dt*ts;
	if (thing.endspeed > 260) thing.endspeed = 240;
}

function drawThing(thing)
{
	var so = env.offset;
	var r = env.cradius;
	var g = env.cgap;
	//love.graphics.setLineWidth(2*env.thickness)
	//for i,p in ipairs(thing.parts) do
	ctx.strokeStyle = 'rgb('+thing.color[0]+','+thing.color[1]+','+thing.color[2]+')';
	ctx.beginPath();
	for (var i=0; i<thing.parts.length; i++)
	{
		var p = thing.parts[i];
		if (p.typ == 1)
		{
			var x = p.x;
			var y = p.y;
			var sg = p.ds;
			var eg = p.d;
			//love.graphics.setColor(thing.color)
			//if debug then love.graphics.setColor(255-thing.color[1],255-thing.color[2],255-thing.color[3]) end
			//love.graphics.arc("line", "open", so+x*(2*r+g), so+y*(2*r+g), env.cradius, math.rad(sg), math.rad(eg), 20)
			var cw = false;
			if (sg > eg) cw = true;
			//doArc(so+x*(2*r+g), so+y*(2*r+g), env.cradius, rads(sg), rads(eg));
			var ax = so+x*(2*r+g);
			var ay = so+y*(2*r+g);
			ctx.moveTo(ax+env.cradius*Math.cos(rads(sg)), ay+env.cradius*Math.sin(rads(sg)));
			ctx.arc(ax, ay, env.cradius, rads(sg), rads(eg),cw);
		}
		else if (p.typ == 2)
		{
			//love.graphics.setColor(thing.color)
			//love.graphics.line(so+p.fromx, so+p.fromy, so+p.x, so+p.y)
			//doLine(so+p.fromx, so+p.fromy, so+p.x, so+p.y);
			ctx.moveTo(so+p.fromx,so+p.fromy);
			ctx.lineTo(so+p.x,so+p.y);
		}
	}
	ctx.stroke();
}
function update(dt)
{
	//limit large dt
	//if (dt > 1) dt = 0;
	//position things
	for (var i=0; i<things.length; i++)
	{
		updateThing(things[i], dt);
	}
	//slowly add more things
	if (things.length < env.thingcount)
	{
		if (randI(1,10) == 10)
		{
			things.push(createThing(randI(1,env.xcount-0), randI(1, env.ycount-0)));
		}
	}
	//remove finished things
	for (var i=0; i<things.length; i++)
	{
		if (things[i].parts.length == 0)
		{
			things.splice(i, 1);
		}
	}
}

function draw(dt)
{
	//ctx.fillStyle = 'rgb(13,10,10)';	
	//ctx.fillRect(0,0,canvas.width,canvas.height);
	//ctx.clearRect(0,0,canvas.width, canvas.height);
	var so = env.offset;
	var r = env.cradius;
	var g = env.cgap;
	var time = dt;
	ctx.fillStyle = bgpattern;
	ctx.fillRect(0,0,canvas.width, canvas.height);
	//old background draw (not cached)
	/*
	for (var ix=0;ix<=env.xcount;ix++)
	{
		for (var iy=0; iy<=env.ycount; iy++)
		{
			//var nt = 2*Math.sin((ix+iy+time*3)/2);
			//var nd = 2*Math.sin((ix-iy+time*3)/4);
			var x = so+ix*(2*r+g);
			var y = so+iy*(2*r+g);
			//ctx.strokeStyle='rgb('+(25+nd)+','+(20+nd)+','+(20+nd)+')';
			ctx.strokeStyle='rgb(25,20,20)';
			ctx.lineWidth = env.thickness;
			ctx.beginPath();
			ctx.arc(x,y,env.cradius,0,2*Math.PI,false);
			ctx.stroke();
			//ctx.fillStyle='rgb('+(18+nt*1.2)+','+(15+nt)+','+(15+nt)+')';
			ctx.fillStyle='rgb(18,15,15)';
			ctx.beginPath();
			ctx.arc(x,y,env.cradius/2,0,2*Math.PI,false);
			ctx.fill();
		}
	}
	*/

	ctx.lineWidth = env.thickness;
	if (ctx.lineWidth > env.cradius) ctx.lineWidth = env.cradius;
	ctx.lineCap = 'round';
	for (var i=0;i<things.length;i++)
	{
		drawThing(things[i]);
		//debugThing(t,i)
	}
	//debug info onscreen
	if (false)
	{
		ctx.font = "12px sans-serif";
		ctx.fillStyle = "rgb(100,100,100)";
		ctx.textBaseline = "top";
		ctx.fillText("Things: "+things.length+"/"+env.thingcount,10,10);
		ctx.fillText("FPS: "+env.fps,10,25);
		ctx.fillText("env: "+JSON.stringify(env, null, 2),10,40);
	}
}

function figuresize()
{
	canvas.width = canvas.getBoundingClientRect().width;
	canvas.height = canvas.getBoundingClientRect().height;
	var w = canvas.width;
	var h = canvas.height;
	env.xcount = Math.ceil(w/(2*env.cradius+env.cgap))-1;
	env.ycount = Math.ceil(h/(2*env.cradius+env.cgap))-1;
	env.offset = 0;
	bgpattern = createBG();
}

function run()
{
	figuresize();
	var last = performance.now() / 1000;
	var fpsThreshold = 0;	
	window.requestAnimationFrame(tickweb);

	function tickweb() {
		// Keep animating
		window.requestAnimationFrame(tickweb);

		// Figure out how much time passed since the last animation
		var now = performance.now() / 1000;
		var dt = Math.min(now - last, 1);
		last = now;

		// If there is an FPS limit, abort updating the animation if we reached the desired FPS
		if (env.fps > 0 && env.fpslock) {
			fpsThreshold += dt;
			if (fpsThreshold < 1.0 / env.fps) {
				return;
			}
			fpsThreshold -= 1.0 / env.fps;
		}

		// My wallpaper animation/drawing code goes here!
		update(dt);
		draw(dt);
	}
}

//wallpaper engine events
window.wallpaperPropertyListener = {
	applyUserProperties: function(properties) {
		if (properties.linecount) {
			env.thingcount = properties.linecount.value;
			while (things.length > env.thingcount) {
				things.pop();
			}
		}
		if (properties.linethick) {
			env.thickness = properties.linethick.value;
			bgpattern = createBG();
		}
		if (properties.circleradius) {
			env.cradius = properties.circleradius.value;
			env.cgap = properties.circleradius.value;
			figuresize();
			//FIXME line segment absolute positions are cached so must be cleared
			while (things.length > 0) {
				things.pop();
			}
		}
		if (properties.playbackrate) {
			env.timescale = properties.playbackrate.value/100.0;
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
run();
})();
