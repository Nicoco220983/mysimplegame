(function(){
var thisDir = MSG.getDir("spiky_ball.js")

var SpikyBall = MSG.SpikyBall = MSG.Elem.new()

// size
SpikyBall.size = 25
SpikyBall.shape = MSG.CIRCLE

// gravity
SpikyBall.add(MSG.Gravity)

// sprite
MSG.Sprite.new({src:thisDir+"/sprite.png"}).addTo(SpikyBall)


// bouncing spiky ball ///////////////////

var BouncingSpikyBall = MSG.BouncingSpikyBall = SpikyBall.new()

BouncingSpikyBall.mapRebounce = 1
BouncingSpikyBall.mapRebounceMinSpd = 0

}())