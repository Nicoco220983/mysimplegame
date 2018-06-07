(function(){
var thisDir = MSG.getDir("nico.js")

var Nico = MSG.Nico = MSG.Elem.new()

// size
Nico.width = 20
Nico.height = 30

// sprites
Nico.spriteStanding = MSG.Sprite.new({src:thisDir+"/sprites/standing/#.png", nb:2}).addTo(Nico)
Nico.spriteRunning = MSG.Sprite.new({src:thisDir+"/sprites/running/#.png", nb:6}).addTo(Nico)
Nico.spriteJumpingUp = MSG.Sprite.new({src:thisDir+"/sprites/standing/up.png"}).addTo(Nico)
Nico.spriteJumpingDown = MSG.Sprite.new({src:thisDir+"/sprites/standing/down.png"}).addTo(Nico)

// gravity
Nico.add(MSG.Gravity)

// walk
Nico.walkMaxSpd = 300
Nico.walkAcc = 500
Nico.walkAccFun = MSG.genAccDec(
	MSG.genLinAcc(),
	MSG.genGeoAcc(1, 50)
)
Nico.walkInVoidAcc = 300
Nico.tryWalk = function(dir){
	var col = this.mapCol,
		collide = col && col.wallsA > PI
	if(collide) {
		if(dir===STOP) this.stopWalk()
		else if(dir===LEFT) this.walk(col.wallsA-PI/2)
		else if(dir===RIGHT) this.walk(col.wallsA+PI/2)
	} else {
		this.walkInVoid(dir)
	}
	// sprite
	if(dir===LEFT) {
		this.sprite = this.spriteRunning
		this.spriteWidthStretch = -1
		this.spriteSpd = 10
	} else if(dir===RIGHT) {
		this.sprite = this.spriteRunning
		this.spriteWidthStretch = 1
		this.spriteSpd = 10
	} else {
		this.sprite = this.spriteStanding
		this.spriteSpd = 1
	}
}
Nico.walk = function(a){
	var walkSpdX=this.mapColSpdX, walkSpdY=this.mapColSpdY
	if(walkSpdX===0 && walkSpdY===0) var walkSpd=0
	else {
		var walkSpd=norm(walkSpdX, walkSpdY),
			walkSpdA=atan2(walkSpdY, walkSpdX)
		walkSpd *= cos(a-walkSpdA)
	}
	walkSpd += accTo(walkSpd, this.walkMaxSpd, this.walkAcc, this.walkAccFun)
	this.mapColSpdX = walkSpd*cos(a)
	this.mapColSpdY = walkSpd*sin(a)
}
Nico.stopWalk = function(){
	var walkSpdX=this.mapColSpdX, walkSpdY=this.mapColSpdY
	if(walkSpdX===0 && walkSpdY===0) return
	var walkSpd=norm(walkSpdX, walkSpdY), walkSpdA=atan2(walkSpdY, walkSpdX)
	walkSpd += accTo(walkSpd, 0, this.walkAcc, this.walkAccFun)
	this.mapColSpdX = walkSpd*cos(walkSpdA)
	this.mapColSpdY = walkSpd*sin(walkSpdA)
}
Nico.walkInVoid = function(dir){
	// update spdX
	if(dir===STOP) var spd = 0
	else spd = this.walkMaxSpd * (dir===LEFT ? -1 : 1)
	this.accXTo(spd, this.walkInVoidAcc, this.walkAccFun)
	// update mapColSpds
	this.mapColSpdX = this.spdX
	this.mapColSpdY = 0
}

// jump
Nico.jumpAcc = 750
Nico.jumpDuration = 0.25
Nico.jumpWallsAngPart = 0
Nico._jumpNbRem = 0
Nico._jumpA = null
Nico.tryJump = function(){
	var col = this.mapCol
	// if Nico is colliding wall
	if(col && col.wallsA >= PI) { // TODO: better angle comparison
		var wallsA = avgAng(-PI/2, col.wallsA, this.jumpWallsAngPart)
		this.jump(wallsA)
		this._jumpNbRem=ceil(this.jumpDuration*this.game.fps)-1
		this._jumpA=wallsA
	} else {
		if(this._jumpNbRem>0){
			this.jump(this._jumpA)
			this._jumpNbRem--
		}
	}
}
Nico.jump = function(a){
	var dSpd = this.jumpAcc / this.jumpDuration / this.game.fps
	this.spdX += cos(a)*dSpd
	this.spdY += sin(a)*dSpd
}

// key down action
Nico.act(function(){
	var game = this.game
	// walk
	if(game.isKeyDown("ArrowLeft")) this.tryWalk(LEFT)
	else if(game.isKeyDown("ArrowRight")) this.tryWalk(RIGHT)
	else this.tryWalk(STOP)
	// jump
	if(game.isKeyDown("ArrowUp")) this.tryJump()
})

// consts
var STOP = 0,
	LEFT = 1,
	RIGHT = 2

// various
var abs=Math.abs, ceil=Math.ceil,
	cos=Math.cos, sin=Math.sin,
	PI=Math.PI,
	atan2=Math.atan2

var norm=MSG.norm, avgAng=MSG.avgAng,
	accTo=MSG.accTo

})()