(function(){

var genLinAcc = MSG.genLinAcc = function(acc){
	if(acc===undefined) acc=1
	return function(spd, tgtSpd, dSpd){
		var res
		if(spd===tgtSpd) res = 0
		else {
			dSpd *= acc
			var tgtDSpd = tgtSpd-spd
			if(abs(tgtDSpd)<=dSpd) res = tgtDSpd
			else res = (tgtDSpd>0) ? dSpd : -dSpd
		}
		return res
	}
}
var linAcc = MSG.linAcc = genLinAcc()

var genGeoAcc = MSG.genGeoAcc = function(acc, level){
	if(acc===undefined) acc=1
	if(level===undefined) level=100
	return function(spd, tgtSpd, dSpd){
		dSpd *= acc
		var aSpd = abs(spd)
		if(aSpd>level) dSpd *= aSpd/level
		return linAcc(spd, tgtSpd, dSpd)
	}
}
var geoAcc = MSG.geoAcc = genGeoAcc()

var genAccDec = MSG.genAccDec = function(accFun, decFun){
	var resFun = function(spd, tgtSpd, dSpd){
		var res
		if(spd===tgtSpd) res = 0
		// determine real acc
		else if(spd*tgtSpd<0){
			// deceleration to 0
			// determine dSpd
			var dSpd2 = decFun(spd, tgtSpd, dSpd),
				adSpd2 = abs(dSpd2)
			// apply dSpd
			if(dSpd2===0) res = 0
			else if(abs(spd)<adSpd2) {
				var remDSpd = dSpd*((adSpd2-abs(spd))/adSpd2)
				res = dSpd2 + resFun(0, tgtSpd, remDSpd)
			} else res = dSpd2
		} else {
			// determine dSpd
			var fun = (abs(tgtSpd)<abs(spd)) ? decFun : accFun
			res = fun(spd, tgtSpd, dSpd)
		}
		return res
	}
	return resFun
}

var defAcc = MSG.defAcc = genAccDec(
	genLinAcc(),
	genGeoAcc()
)

var accTo = MSG.accTo = function(spd, tgtSpd, acc, accFun){
	if(acc===undefined) acc=abs(tgtSpd-spd)
	if(accFun===undefined) accFun=defAcc
	var dSpd = acc/MSG.fps
	return accFun(spd, tgtSpd, dSpd)
}


// Inertia /////////////////////////////////////
var Designer = MSG.Designer

var Inertia = MSG.Inertia = Designer.new()

Inertia.design = function(el){
	if(el.hasInertia===true) return
	el.hasInertia=true

	if(el.spdX===undefined) el.spdX = 0
	if(el.spdY===undefined) el.spdY = 0
	if(el.aSpd===undefined) el.aSpd = 0

	el.accXTo = accXTo
	el.accYTo = accYTo
	el.accAngTo = accAngTo

//	el.moveTo = moveTo
//	el.rotateTo = rotateTo

	el.processSpeeds = processSpeeds
	el.act(processSpeedsAct)
}

var accXTo = function(tgtSpd, acc, accFun) {
	this.spdX += accTo(this.spdX, tgtSpd, acc, accFun)
}
var accYTo = function(tgtSpd, acc, accFun) {
	this.spdY += accTo(this.spdY, tgtSpd, acc, accFun)
}
var accAngTo = function(tgtSpd, acc, accFun) {
	this.aSpd += accTo(this.aSpd, tgtSpd, acc, accFun)
}
/*
var moveTo = function(target, speed, args) {
	var acc = getArg(args, "acc", speed)
	var dec = getArg(args, "dec", acc*2)
	var targetDistance = getArg(args, "distance", 0.0001)
	var diffX = target.x - this.x
	var diffY = target.y - this.y
	var currentDistance = sqrt(diffX*diffX + diffY*diffY)
	if(currentDistance > targetDistance) {
		if(currentDistance<=dec) {
			this.updSpdX(diffX, acc, dec)
			this.updSpdY(diffY, acc, dec)
		} else {
			var distanceToStop = speed*speed/dec/2
			var distanceFactor = bound((currentDistance-targetDistance)/distanceToStop, 0, 1)
			var a = atan2(diffY, diffX)
			var cosA = cos(a), sinA = sin(a)
			this.updSpdX(speed*distanceFactor*cosA, acc*abs(cosA), dec)
			this.updSpdY(speed*distanceFactor*sinA, acc*abs(sinA), dec)
		}
		return false
	} else {
		this.updSpdX(0, acc, dec)
		this.updSpdY(0, acc, dec)
		return true
	}
}

var rotateTo = function(target, speed, args) {
	var acc = getArg(args, "acc", speed)
	var dec = getArg(args, "dec", acc*2)
	var targetDistance = getArg(args, "distance", 0.0001)
	var a = (typeof(target)=="number") ? target : this.getAngleFrom(target)
	var diffA = normAng(a-this.a)
	var currentDistance = abs(diffA)
	if(currentDistance > targetDistance) {
		if(currentDistance<=dec) {
			this.accT(diffA, acc, dec)
		} else {
			var distanceToStop = speed*speed/dec/2
			var distanceFactor = bound((currentDistance-targetDistance)/distanceToStop, 0, 1)
			this.accT(speed*distanceFactor*sign(diffA), acc, dec)
		}
		return false
	} else {
		this.accT(0, acc, dec)
		return true
	}
}
*/

var processSpeeds = function() {
	var fps = this.game.fps
	this.x += this.spdX/fps
	this.y += this.spdY/fps
	this.a = normAng(this.a + this.aSpd/fps)
}
var processSpeedsAct = function() {
	this.processSpeeds()
}


// Gravity /////////////////////////////////////

var Gravity = MSG.Gravity = Designer.new()

Gravity.x = 0
Gravity.maxX = 1500
Gravity.y = 1500
Gravity.maxY = 1500

Gravity.acc = linAcc

Gravity.removeDistance = 100

Gravity.design = function(el) {

	el.add(Inertia)

	el.gravity = this
	el.act(_GravityAct)
}
var _GravityAct = function() {
	var fps = this.game.fps
	var grav=this.gravity,
		gravX=grav.x, gravY=grav.y,
		gravAcc=grav.acc
	if(gravX)
		this.spdX += accTo(this.spdX, grav.maxX, gravX, gravAcc)
	if(gravY)
		this.spdY += accTo(this.spdY, grav.maxY, gravY, gravAcc)
	// remove distance
	var rmDist = grav.removeDistance
	if(rmDist) {
		var x=this.x, y=this.y, scene=this.scene
		var doRm =
			( gravX>0 && x>scene.width+rmDist )
			|| ( gravX<0 && x<-rmDist )
			|| ( gravY>0 && y>scene.height+rmDist )
			|| ( gravY<0 && y<-rmDist )
		if(doRm) this.remove()
	}
}



// Mover /////////////////////////////////////

var Mover = MSG.Mover = Designer.new()

Mover.maxSpeed = 500
Mover.acc = 500

Mover.design = function(el){

	el.add(Inertia)

	el.mover = this
	el.act(_MoverAct)
}
_MoverAct = function(){
	var keysdown = this.game.keysdown
	var mover=this.mover, maxSpeed=mover.maxSpeed, acc=mover.acc
	if(keysdown["ArrowLeft"]) this.accXTo(-maxSpeed, acc)
	else if(keysdown["ArrowRight"]) this.accXTo(maxSpeed, acc)
	else this.accXTo(0, acc)
	if(keysdown["ArrowUp"]) this.accYTo(-maxSpeed, acc)
	else if(keysdown["ArrowDown"]) this.accYTo(maxSpeed, acc)
	else this.accYTo(0, acc)
}

// imports

var abs = Math.abs,
	sqrt = Math.sqrt,
	cos = Math.cos, sin = Math.sin,
	atan2 = Math.atan2

var sign = MSG.sign,
	bound = MSG.bound,
	norm = MSG.norm,
	normAng = MSG.normAng
/*
var getArg = function(args, key, defVal) {
	if(!args) return defVal
	var val = args[key]
	if(val===undefined) return defVal
	return val
}
*/

}())
