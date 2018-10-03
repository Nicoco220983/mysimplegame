(function(){
var thisDir = MSG.getDir("biting_skull.js")

MSG.BitingSkull = class extends MSG.Elem {
	constructor(){
		super(...arguments)
		this.watchZone = Object.create(this)
		this.watchZone.width = this.watchWidth
		this.watchZone.height = this.watchHeight
		this.add(BitingSkullWatchAct)
			.add(BitingSkullDamageAct)
			.add(MSG.Gravity)
	}
}
var BitingSkullPt = MSG.BitingSkull.prototype

// size
BitingSkullPt.size = 25
BitingSkullPt.shape = "circle"

// watchZone
BitingSkullPt.watchWidth = 200
BitingSkullPt.watchHeight = 100

// sprite
BitingSkullPt.sprite = BitingSkullPt.spriteStanding = new MSG.Sprite({src:thisDir+"/sprites/1.png"})
BitingSkullPt.spriteBiting = new MSG.Sprite({src:thisDir+"/sprites/#.png", nb:6})
MSG.BitingSkull.preload(BitingSkullPt.spriteStanding, BitingSkullPt.spriteBiting)

BitingSkullPt.spriteSpd = 25

// watch

BitingSkullPt.watchBeginTime = 0
BitingSkullPt.watchWaitTime = 3

var BitingSkullWatchAct = new MSG.Action(function(){
	if(this.watchBeginTime <= this.time)
		checkCollision(this.watchZone, this.targets, _BitingSkullWatchAct2) 
})
var _BitingSkullWatchAct2 = function(wz, el){
	var self = Object.getPrototypeOf(wz)
	self.jumpToward(el)
	self.watchBeginTime = self.time + self.watchWaitTime
}

// jump

BitingSkullPt.jumpSpeed = 400
BitingSkullPt.jumpAng = Math.PI/4

BitingSkullPt.jumpToward = function(el){
	var spd = this.jumpSpeed, spdAng = this.jumpAng
	this.spdY -= spd * sin(spdAng)
	var dir = (this.x < el.x) ? -1 : 1
	this.spdX -= dir * spd * cos(spdAng)
	// sprite
	this.sprite = this.spriteBiting
	this.spriteWidthStretch = dir
	this.act(this.watchWaitTime, BitingSkullResetSprite)
}
var BitingSkullResetSprite = function(){
	this.sprite = this.spriteStanding
}

// damage
var BitingSkullDamageAct = new MSG.Action(function(){
	checkCollision(this, this.targets, _BitingSkullDamageAct2) 
})
var _BitingSkullDamageAct2 = function(self, el){
	self.trigger("damage", el)
	el.trigger("damaged", self)
}

// imports

var checkCollision = MSG.checkCollision

var cos = Math.cos, sin = Math.sin

}())
