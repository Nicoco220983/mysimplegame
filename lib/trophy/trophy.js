(function(){
var thisDir = MSG.getDir("trophy.js")

MSG.Trophy = class extends MSG.Elem {
	constructor(scn, args){
		super(scn, args)
		initArr(scn, "trophies").push(this)
		this.add(TrophyAction)
	}
}
var TrophyPt = MSG.Trophy.prototype

// size
TrophyPt.size = 25

// sprite
TrophyPt.sprite = new MSG.Sprite({src:thisDir+"/sprite.png"})
MSG.Trophy.preload(TrophyPt.sprite)

// action
var TrophyAction = new MSG.Action("catched", function(){
	// remove trophy
	this.remove()
	// victory of no more trophies
	var scn = this.scene, trophies = scn.trophies, nbTrophies = 0
	for(var t of trophies)
		if(!t.removed)
			nbTrophies++
	if(nbTrophies===0)
		scn.trigger("victory", this)
})

// imports
var initArr = MSG.initArr

}())
