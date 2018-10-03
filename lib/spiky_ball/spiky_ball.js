(function(){
var thisDir = MSG.getDir("spiky_ball.js")

MSG.SpikyBall = class extends MSG.Elem {
	constructor(){
		super(...arguments)
		this.add(SpikyBallAct)
	}
}
var SpikyBallPt = MSG.SpikyBall.prototype

// size
SpikyBallPt.size = 25
SpikyBallPt.shape = "circle"

// sprite
SpikyBallPt.sprite = new MSG.Sprite({src:thisDir+"/sprite.png"})
MSG.SpikyBall.preload(SpikyBallPt.sprite)

// action
var SpikyBallAct = new MSG.Action(function(){
	checkCollision(this, this.targets, SpikyBallAct2) 
})
var SpikyBallAct2 = function(self, el){
	self.trigger("damage", el)
	el.trigger("damaged", self)
}

// bouncing spiky ball ///////////////////

MSG.BouncingSpikyBall = class extends MSG.SpikyBall {
	constructor(){
		super(...arguments)
		this.add(MSG.Gravity)
	}
}
var BouncingSpikyBallPt = MSG.BouncingSpikyBall.prototype

BouncingSpikyBallPt.mapRebounce = 1
BouncingSpikyBallPt.mapRebounceMinSpd = 0

// imports

var checkCollision = MSG.checkCollision

}())
