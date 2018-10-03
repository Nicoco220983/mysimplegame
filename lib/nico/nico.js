(function(){
var thisDir = MSG.getDir("nico.js")

var Nico = MSG.Nico = class extends MSG.Elem {
  constructor(scn, args){
    super(scn, args)
    this.add(NicoAction)
      .add(MSG.Gravity)
  }
}
var NicoPt = Nico.prototype

// size
NicoPt.width = 20
NicoPt.height = 30

// sprites
NicoPt.spriteStanding = NicoPt.sprite = new MSG.Sprite({src:thisDir+"/sprites/standing/#.png", nb:2})
NicoPt.spriteRunning = new MSG.Sprite({src:thisDir+"/sprites/running/#.png", nb:6})
NicoPt.spriteJumpingUp = new MSG.Sprite({src:thisDir+"/sprites/standing/up.png"})
NicoPt.spriteJumpingDown = new MSG.Sprite({src:thisDir+"/sprites/standing/down.png"})
Nico.preload(NicoPt.spriteStanding, NicoPt.spriteRunning, NicoPt.spriteJumpingUp, NicoPt.spriteJumpingDown)

// walk
NicoPt.walkMaxSpd = 300
NicoPt.walkAcc = 500
NicoPt.walkAccFun = MSG.genAccDec(
	MSG.genLinAcc(),
	MSG.genGeoAcc(1, 50)
)
NicoPt.walkInVoidAcc = 300
NicoPt.tryWalk = function(dir){
	var col = this.mapCol,
		collide = col && col.ang > PI
	if(collide) {
		if(dir===STOP) this.stopWalk()
		else if(dir===LEFT) this.walk(col.ang-PI/2)
		else if(dir===RIGHT) this.walk(col.ang+PI/2)
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
NicoPt.walk = function(a){
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
NicoPt.stopWalk = function(){
	var walkSpdX=this.mapColSpdX, walkSpdY=this.mapColSpdY
	if(walkSpdX===0 && walkSpdY===0) return
	var walkSpd=norm(walkSpdX, walkSpdY), walkSpdA=atan2(walkSpdY, walkSpdX)
	walkSpd += accTo(walkSpd, 0, this.walkAcc, this.walkAccFun)
	this.mapColSpdX = walkSpd*cos(walkSpdA)
	this.mapColSpdY = walkSpd*sin(walkSpdA)
}
NicoPt.walkInVoid = function(dir){
	// update spdX
	if(dir===STOP) var spd = 0
	else spd = this.walkMaxSpd * (dir===LEFT ? -1 : 1)
	this.accXTo(spd, this.walkInVoidAcc, this.walkAccFun)
	// update mapColSpds
	this.mapColSpdX = this.spdX
	this.mapColSpdY = 0
}

// jump
NicoPt.jumpAcc = 750
NicoPt.jumpDuration = 0.25
NicoPt.jumpColAngPart = 0
NicoPt._jumpNbRem = 0
NicoPt._jumpA = null
NicoPt.tryJump = function(){
	var col = this.mapCol
	// if Nico is colliding wall
	if(col && col.ang >= PI) { // TODO: better angle comparison
		var colA = avgAng(-PI/2, col.ang, this.jumpColAngPart)
		this.jump(colA)
		this._jumpNbRem=ceil(this.jumpDuration*MSG.fps)-1
		this._jumpA=colA
	} else {
		if(this._jumpNbRem>0){
			this.jump(this._jumpA)
			this._jumpNbRem--
		}
	}
}
NicoPt.jump = function(a){
	var dSpd = this.jumpAcc / this.jumpDuration / MSG.fps
	this.spdX += cos(a)*dSpd
	this.spdY += sin(a)*dSpd
}

// key down action
var NicoAction = new MSG.Action(function(){
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
