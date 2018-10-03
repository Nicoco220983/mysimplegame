(function(){
var thisDir = MSG.getDir("bat.js")

var BatCore = class extends MSG.Elem {
	constructor(){
		super(...arguments)
		this.origX = this.x
		this.origY = this.y
		BatStartMove(this)
		this.add(Inertia)
			.add(BatCollAct)
		BatSetDir(this, (Math.random() > 0.5) ? 1 : -1)
	}
}
var BatCorePt = BatCore.prototype

// size
BatCorePt.width = 30
BatCorePt.height = 20

// sprite
BatCorePt.sprite = new MSG.Sprite({src:thisDir+"/sprites/#.png", nb:6})
BatCore.preload(BatCorePt.sprite)

BatCorePt.spriteSpd = 25

// move

BatCorePt.moveDist = 100
BatCorePt.speed = 300
BatCorePt.acc = 500
BatCorePt.maxTimeBeforeMove = 1

var BatStartMove = function(self){
	// random before start time
	var startTime = Math.random() * self.maxTimeBeforeMove
	self.act(startTime, BatStartMove2)
}
var BatStartMove2 = function(){
	// random start dir
	this.add(this.MoveAct)
}
var BatSetDir = function(self, dir){
	self.dir = dir
	self.spriteWidthStretch = -dir
}

// collision action
var BatCollAct = new MSG.Action(function(){
	checkCollision(this, this.targets, BatCollAct2) 
})
var BatCollAct2 = function(self, el){
	self.trigger("damage", el)
	el.trigger("damaged", self)
}



// Bat (horizontal)

var Bat = MSG.Bat = class extends BatCore {}
var BatPt = Bat.prototype

BatPt.MoveAct = new MSG.Action(function(){
	var dir = this.dir
	// if we go futher than target, change dir
	var tgtX = this.origX + (dir * this.moveDist)
	if((dir===1 && this.x > tgtX) || (dir===-1 && this.x < tgtX))
		BatSetDir(this, -dir)
	// move
	this.accXTo(this.speed*dir, this.acc)
})


// Bat (vertical)

var BatV = MSG.BatV = class extends BatCore {}
var BatVPt = BatV.prototype

BatVPt.MoveAct = new MSG.Action(function(){
	var dir = this.dir
	// if we go futher than target, change dir
	var tgtY = this.origY + (dir * this.moveDist)
	if((dir===1 && this.y > tgtY) || (dir===-1 && this.y < tgtY))
		BatSetDir(this, -dir)
	// move
	this.accYTo(this.speed*dir, this.acc)
})


// imports

var norm = MSG.norm
var checkCollision = MSG.checkCollision
var Inertia = MSG.Inertia

}())
