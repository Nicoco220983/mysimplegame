(function(){

// Collider
/*
var Collider = MSG.Collider = class extends MSG.Designer {
	constructor(args){
		super(args)
		this.targets = asArr(this.target)
	}
}
var ColliderPt = Collider.prototype

ColliderPt.design = function(el){
	initArr(el, "colliders").push(this)
	el.add(ColliderAct)
}
var ColliderAct = new MSG.Action(function(){
	for(var col of this.colliders)
		for(var tgt of col.targets)
			if(typeof tgt === "string")
				checkCollideTeam(col, this, tgt)
			else
				checkCollideEl(col, this, tgt)
})
*/
var checkCollision = MSG.checkCollision = function(el, target, next){
	if(!target) return
	else if(typeof target === "string")
		checkCollisionTeam(el, target, next)
	else if (isArr(target))
		for(var tgt of target)
			checkCollision(el, tgt, next)
	else
		checkCollisionElem(el, target, next)
}
var checkCollisionTeam = function(el, team, next){
	var tgtTeamEls = el.scene.teamsElems[team]
	if(tgtTeamEls) for(var tgtEl of tgtTeamEls)
		checkCollisionElem(el, tgtEl, next)
}
var checkCollisionElem = function(el, tgtEl, next){
	if(collide(el, tgtEl))
		next(el, tgtEl)
}

var collide = function(el1, el2){
	var x1=el1.x, y1=el1.y, x2=el2.x, y2=el2.y,
		w1=el1.width/2, h1=el1.height/2, w2=el2.width/2, h2=el2.height/2,
		x11=x1-w1, x12=x1+w1, x21=x2-w2, x22=x2+w2,
		y11=y1-h1, y12=y1+h1, y21=y2-h2, y22=y2+h2
	if(x12<x21 || x11>x22 || y12<y21 || y11>y22) return false
	return true
}

// imports

var isArr = Array.isArray
/*
var asArr = function(a){
	return (a && !isArr(a)) ? [a] : a
}

var initArr = MSG.initArr
var initObj = MSG.initObj
var Elem = MSG.Elem
*/

}())
