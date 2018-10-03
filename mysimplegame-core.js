(function(){

// global vars

MSG = MySimpleGame = {}

MSG.fps = 30

// OBJ /////////////////////////////////////////////

//var MsgObj = MSG.Obj = MSG.Object = {}

// new
var ObjCreate = Object.create,
	ObjAssign = Object.assign

var inherits = function(obj1, obj2){
	return obj1===obj2 || obj2.isPrototypeOf(obj1)
}

// inits
/*
var initOwnArr = function(obj, prop){
	var arr = obj[prop]
	if(!arr) arr = obj[prop] = []
	else if(!obj.hasOwnProperty(prop))
		arr = obj[prop] = arr.slice()
	return arr
}

var initOwnArrMsgObj = function(obj, prop){
	var arr = obj[prop]
	if(!arr) arr = obj[prop] = []
	else if(!obj.hasOwnProperty(prop)){
		var len = arr.length,
			ownArr = obj[prop] = new Array(len)
		for(var i=0; i<len; ++i)
			ownArr[i] = arr[i].new()
		ownArr = arr
	}
	return arr
}
*/
var initArr = MSG.initArr = function(obj, prop){
	var arr = obj[prop]
	if(!arr) arr = obj[prop] = []
	return arr
}

var initObj = MSG.initObj = function(obj, prop){
	var _obj = obj[prop]
	if(!_obj) _obj = obj[prop] = {}
	return _obj
}

var MsgObj = MSG.Obj = MSG.Object = class {
  constructor(args){
    if(args) this.set(args)
  }
}
var MsgObjPt = MsgObj.prototype

// set

MsgObjPt.set = function(args){
	ObjAssign(this, args)
	return this
}

// x, y, ang, width, height

MsgObjPt.x = 0
MsgObjPt.y = 0
MsgObjPt.ang = 0
MsgObjPt.width = 30
MsgObjPt.height = 30

MsgObjPt.setPos = function(x, y){
	this.x = x
	this.y = y
	return this
}

// sprite

Object.defineProperty(MsgObjPt, 'spriteSize', {
	set(size){
		this.spriteWidth = size
		this.spriteHeight = size
	}
})
MsgObjPt.spriteSize = 'fill'

MsgObjPt.spriteWidthStretch = 1
MsgObjPt.spriteHeightStretch = 1

MsgObjPt.spriteSpd = 1
MsgObjPt.spriteStartTime = 0

Object.defineProperty(MsgObjPt, 'size', {
	set(size){
		this.width = size
		this.height = size
	}
})

// sprite
/*
Object.defineProperty(MsgObjPt, 'sprite', {
	get(){ return this._sprite },
	set(sprite){
		if(sprite === true) sprite = "black"
		if(typeof sprite === "string"){
			var color = sprite
			sprite = new Sprite().set(
				'fillStyle', color,
				'width', 'parent',
				'height', 'parent',
				'shape', 'parent')
		}
		this._sprite = sprite
	}
})
*/
//var FIT = MSG.FIT = -1,
//	FILL = MSG.FILL = -2

var MsgObjDraw_spriteTrans = {}
var MsgObjDraw = function(obj, ctx, x, y){
	var sprite = obj.sprite
	if(!sprite) return
	if(typeof sprite === 'string'){
		var color = sprite
		var sprite = obj.sprite = SpriteGetRawFromCache(obj, color)
	}
	if(sprite instanceof Sprite) {
		if(sprite.load()){
			var t = MsgObjDraw_spriteTrans
			t.ang = obj.ang
			MsgObjComputeSpriteSize(obj, sprite, t)
			var numImg = floor((obj.time - obj.spriteStartTime) * obj.spriteSpd)
			var img = sprite.getImg(numImg, t)
			if(img)
				ctx.drawImage(img,
					round(x+img.x),
					round(y+img.y))
		}
	} else {
		ctx.drawImage(sprite, round(x), round(y))
	}
}

var MsgObjComputeSpriteSize = function(obj, sprite, trans){
	var sw=obj.spriteWidth, sh=obj.spriteHeight
	// null
	if(!sw) trans.width = 1
	if(!sh) trans.height = 1
	// fixed
	if(sw>0) trans.width = sw / sprite.width
	if(sh>0) trans.height = sh / sprite.height
	// FIT & FILL
	if(sw==='fit' || sh==='fit' || sw==='fill' || sh==='fill'){
		var er = obj.width / obj.height,
			sr = sprite.width / sprite.height,
			eb = (er > sr)
		if((eb && sw==='fit') || (!eb && sw==='fill'))
			trans.width = obj.height / sprite.height
		if((eb && sh==='fit') || (!eb && sh==='fill'))
			trans.height = obj.height / sprite.height
		if((eb && sw==='fill') || (!eb && sw==='fit'))
			trans.width = obj.width / sprite.width
		if((eb && sh==='fill') || (!eb && sh==='fit'))
			trans.height = obj.width / sprite.width
	}
	// stretch
	trans.width *= obj.spriteWidthStretch
	trans.height *= obj.spriteHeightStretch
}



// time

MsgObjPt.time = 0

var MsgObjIncrTime = function(obj) {
	obj.time += 1/MSG.fps
}



// add

var MsgObjAdd = MsgObjPt.add = function(obj){
  if(obj instanceof Action){
    initArr(this, "newActions")
      .push(obj)
  }
  return this
}

MsgObjPt.addTo = function(obj){
	obj.add(this)
	return this
}


// load

var TO_LOAD = 0,
	LOADING = 1,
	LOADED = 2

MsgObjPt._loadState = LOADED

// function to be used by classes
MsgObjPt.preload = function(){
	var self = this
	if(typeof self === "function") self = self.prototype
	self._loadState = TO_LOAD
	if(self._loadDeps === undefined) self._loadDeps = []
	self._loadDeps = self._loadDeps // make own property
	for(var i=0, len=arguments.length; i<len; ++i){
		var dep = arguments[i]
		self._loadDeps.push(dep)
	}
}
MsgObj.preload = MsgObjPt.preload

MsgObjPt.load = function(){
	// loading
	if(this._loadState === LOADED) return true
	this._loadState = LOADING
	// load deps
	var loadDeps=this._loadDeps, allLoaded=true
	if(loadDeps!==undefined){
		for(var i=0, len=loadDeps.length; i<len; ++i){
			if(!loadDeps[i].load())
				allLoaded = false
		}
	}
	if(allLoaded) this._loadState = LOADED
	return allLoaded
}

// actions

var Action = MSG.Action = class {
  constructor(arg1, arg2){
  	if(arg2===undefined) var run=arg1
  	else var on=arg1, run=arg2
  	this.on = on
  	this.run = run
  }
}
var ActionProt = Action.prototype

MsgObjPt.act = function(arg1, arg2) {
	// create newActions (if needed), & fill it
	initArr(this, "newActions")
		.push(new Action(arg1, arg2))
	return this
}

var MsgObjProcessActions = function(obj) {
	MsgObjStartNewActions(obj)
	MsgObjRunActions(obj)
	MsgObjRunTimeActions(obj)
}

var MsgObjStartNewActions = function(obj) {
	var newActions = obj.newActions
	if(!newActions) return
	for(var i=0, len=newActions.length; i<len; ++i)
		MsgObjActionStart(obj, ObjCreate(newActions[i]))
	newActions.length = 0
}

var MsgObjActionStart = function(obj, action){
	var startNow=true
	// on
	startNow &= MsgObjActionInitOn(obj, action, action.on)
	// start
	if(startNow)
		MsgObjActionStartNormal(obj, action)
}

// on
var MsgObjActionInitOn = function(obj, action, on){
	var startNow=true
	var onType = _typeof(on)
	if(onType==="array"){
		for(var i=0, len=on.length; i<len; ++i)
			startNow &= MsgObjActionInitOn(obj, action, on[i])
	} else if(onType==="number"){
		MsgObjActionStartTime(obj, action, on)
		startNow=false
	} else if(onType==="string"){
		MsgObjActionStartEvent(obj, action, on)
		startNow=false
	} else if(onType==="object"){
		// deps
		for(var dep in on){
			var depInit=MsgObjActionDepInits[dep]
			if(depInit!==undefined)
				startNow &= (depInit(obj, on[dep], action) !== false)
		}
		// on
		var on2 = on.on
		if(on2) startNow &= MsgObjActionInitOn(obj, action, on2)
	}
	return startNow
}

// normal

var MsgObjActionStartNormal = function(obj, action) {
	if(action.removed || action.started) return
	action.started = true
	initArr(obj, "actions")
		.push(action)
}

ActionProt.stop = function() {
	this.started = false
	return this
}

ActionProt.remove = function() {
	this.removed = true
	this.started = false
	return this
}

// time

var _ActionCallTargetRun = function(args, action){
	var targetAction = action.target
	if(targetAction.removed) return action.remove()
	targetAction.run.call(this, args, targetAction)
}

var MsgObjActionStartTime = function(obj, action, time) {
	// create time action
	var timeAction = ObjCreate(action)
	time += obj.time
	timeAction.time = time
	timeAction.target = action
	timeAction.run = _ActionCallTargetRun
	// insert in timeActions
	var timeActions = initArr(obj, "timeActions")
	for(var i=0, len=timeActions.length; i<len; ++i) {
		if(timeActions[i].time>time) {
			timeActions.splice(i, 0, timeAction)
			return
		}
	}
	timeActions.push(timeAction)
}

// event

var MsgObjActionStartEvent = function(obj, action, evt) {
	// create event action
	var evtAction = ObjCreate(action)
	evtAction.target = action
	evtAction.run = _ActionCallTargetRun
	// insert in eventsActions
	var eventsActions = initObj(obj, "eventsActions")
	initArr(eventsActions, evt)
		.push(evtAction)
}

// dep actions

var MsgObjActionDepInits = {}

var genMsgObjActionDepInit = function(depRun, depStart, targetStartNow){
	return function(obj, on, action){
		var depAction = new Action()
		depAction.target = action
		depAction.on = on
		depAction.run = depRun
		depStart(obj, depAction)
		return targetStartNow
	}
}

var genActionCondCallTargetRun = function(cond){
	return function(args, action){
		var targetAction = action.target
		if(targetAction.removed) return action.remove()
		if(cond.call(this, action))
			targetAction.run.call(this, args, targetAction)
	}
}

// period

MsgObjActionDepInits.period = function(obj, on, action){
	action.period = on
	action.periodTime = obj.time
	if(action.baseRun===undefined){
		action.baseRun = action.run
		action.run = _ActionRunComplex
	}
}

var _ActionRunComplex = function(args, action) {
	var doRun = false
	// period
	var period = action.period
	if(period!==undefined) {
		action.periodTime = max(action.periodTime, this.time-1/this.game.fps)
		while(this.time >= action.periodTime) {
			doRun = true
			action.periodTime += period
		}
	} else doRun = true
	// run
	if(!doRun) return
	action.baseRun.call(this, null, action)
	// max
	var _max=action.max
	if(_max!==undefined) {
		if((++action.nbRun)>=_max) {
			action.remove()
		}
	}
}

// max

MsgObjActionDepInits.max = function(obj, on, action){
	action.max = on
	action.nbRun = 0
	if(action.baseRun===undefined){
		action.baseRun = action.run
		action.run = _ActionRunComplex
	}
}

// start

var MsgObjActionStartRun = function(args, action) {
	var targetAction = action.target
	if(targetAction.removed) return action.remove()
	MsgObjActionStartNormal(this, targetAction)
}

MsgObjActionDepInits.start = genMsgObjActionDepInit(MsgObjActionStartRun, MsgObjActionStart, false)

// stop

var MsgObjActionStopRun = function(args, action) {
	var targetAction = action.target
	if(targetAction.removed) return action.remove()
	targetAction.started = false
}

MsgObjActionDepInits.stop = genMsgObjActionDepInit(MsgObjActionStopRun, MsgObjActionStart)

// rm

var MsgObjActionRmRun = function(args, action) {
	action.target.remove()
}

MsgObjActionDepInits.rm = genMsgObjActionDepInit(MsgObjActionRmRun, MsgObjActionStart)

// key

var MsgObjActionKeyRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyDown(action.on)
})

MsgObjActionDepInits.key = genMsgObjActionDepInit(MsgObjActionKeyRun, MsgObjActionStartNormal, false)

// keydown

var MsgObjActionKeydownRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyDownNow(action.on)
})

MsgObjActionDepInits.keydown = genMsgObjActionDepInit(MsgObjActionKeydownRun, MsgObjActionStartNormal, false)

// keyup

var MsgObjActionKeyupRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyUpNow(action.on)
})

MsgObjActionDepInits.keyup = genMsgObjActionDepInit(MsgObjActionKeyupRun, MsgObjActionStartNormal, false)


// run

var MsgObjRunActions = function(obj) {
	// actions
	var actions = obj.actions
	if(actions) {
		for(var i=0, len=actions.length; i<len; ++i) {
			var action = actions[i]
			if(action.started) action.run.call(obj, null, action)
			else {
				actions.splice(i, 1)
				i--; len--
			}
		}
	}
}
var MsgObjRunTimeActions = function(obj) {
	// time actions
	var timeActions = obj.timeActions
	if(timeActions) {
		while(timeActions.length>0) {
			var action = timeActions[0]
			if(obj.time >= action.time) {
				if(!action.removed)
					action.run.call(obj, null, action)
				timeActions.splice(0, 1)
			} else break
		}
	}
}

MsgObjPt.trigger = function(evt, args, args2) {
	var eventsActions = this.eventsActions
	if(eventsActions===undefined) return
	var eventActions = eventsActions[evt]
	if(eventActions===undefined) return
	for(var i=0, len=eventActions.length; i<len; ++i) {
		var action = eventActions[i]
		if(action.removed) {
			actions.splice(i, 1)
			i--; len--
		} else {
			if(typeof args==="function")
				args = args.call(this, args2)
			action.run.call(this, args, action)
		}
	}
}



// ELEM /////////////////////////////////////////////

var Elem = MSG.Elem = class extends MsgObj {
	constructor(scene, args){
		super(args)
		this.addTo(scene)
		this.game = this.scene.game
	}
}
var ElemPt = Elem.prototype

// sprite
ElemPt.sprite = "black"

// shape
//var BOX = MSG.BOX = 0,
//	CIRCLE = MSG.CIRCLE = 1

ElemPt.shape = 'box'

// layer
ElemPt.layer = 0

// add
ElemPt.add = function(obj) {
  MsgObjAdd.call(this, obj)
	if(obj instanceof Sprite) {
		if(this.sprite === undefined)
			this.sprite = obj
	}
	if(obj instanceof Designer) {
		obj.design(this)
	}
	return this
}

// start
/*
Elem.onStart = function(scene){
	this.scene = scene
	this.game = scene.game
	_ElemSetX(this, this.x)
	_ElemSetY(this, this.y)
}
*/
// remove
ElemPt.remove = function() {
	if(!this.removed)
		this.trigger("remove")
	this.removed = true
	return this
}

// x, y, angle
/*
Object.defineProperty(Elem, "x", {
	get(){ return this._x },
	set(x){ _ElemSetX(this, x) }
})
var _ElemSetX = function(self, x){
	var t = typeof x
	if(t === "number"){}
	else if(t === "string"){
		if(self.scene){
			if(x === "right") x = self.width / 2
			else if(x === "center") x = self.scene.width / 2
			else if(x === "left") x = self.scene.width - self.width / 2
		}
	}
	self._x = x
}
Elem.x = 0

Object.defineProperty(Elem, "y", {
	get(){ return this._y },
	set(y){ _ElemSetY(this, y) }
})
var _ElemSetY = function(self, y){
	var t = typeof y
	if(t === "number"){}
	else if(t === "string"){
		if(self.scene){
			if(y === "right") y = self.height / 2
			else if(y === "center") y = self.scene.height / 2
			else if(y === "left") y = self.scene.height - self.height / 2
		}
	}
	self._y = y
}
Elem.y = 0

Elem.a = 0
*/
/*
Elem.getPos = function(target) {
	if(target===undefined) target="center"
	if(target==="center") return { x:this.x, y:this.y }
	if(typeof target==="object") {
		var x = this.x, y = this.y, a = this.a
		var w2 = this.width/2, h2 = this.height/2
		var tx = target.x, ty = target.y
		if(tx==="left") {
			x -= w2*cos(a) 
			y -= h2*sin(a)
		} else if(tx==="right") {
			x += w2*cos(a)
			y += h2*sin(a)
		}
		if(ty==="top") {
			x += w2*sin(a) 
			y -= h2*cos(a)
		} else if(ty==="bottom") {
			x -= w2*sin(a)
			y += h2*cos(a)
		}
		return { x:x, y:y }
	}
}

Elem.setPos = function(pos, target) {
	var cpos = this.getPos(target)
	this.x = pos.x + cpos.x - this.x
	this.x = pos.y + cpos.y - this.y
	return this
}
*/
// size
//Elem.size = 30

// process
ElemPt.process = function() {
	// actions
	MsgObjProcessActions(this)
	// draw
	MsgObjDraw(this, this.scene.canvasContext,
		this.x - this.width/2,
		this.y - this.height/2)
	// time
	MsgObjIncrTime(this)
}



// DESIGNER /////////////////////////////////////////////

var Designer = MSG.Designer = class {
	constructor(args){
		ObjAssign(this, args)
	}
}


// SPRITE /////////////////////////////////////////////

var Sprite = MSG.Sprite = class extends MsgObj {
	constructor(){
		super()
		this.imgs = []
		for(var i=0, len=arguments.length; i<len; ++i)
			this.add(arguments[i])
		SpriteInitCacheRotationStep(this)
	}
}
var SpritePt = Sprite.prototype

// size
SpritePt.width = "img"
SpritePt.height = "img"

// default
SpritePt.fillStyle = "black"
SpritePt.font = "Arial"
SpritePt.fontSize = 30

// shape
SpritePt.shape = 'box'

// cache variables
SpritePt.cacheRotationStep = 'auto'

var SpriteInitCacheRotationStep = function(self) {
	if(self.cacheRotationStep==="auto") {
		var maxSize = SpriteGetMaxSize(self)
		self.cacheRotationStep = 16 * max(1, maxSize/10)
	}
}

// raw sprite

var SpriteGetRawFromCache = function(obj, color){
	var key = SpriteGetRawKey(obj, color)
	var sprite = SpriteRawCache[key]
	if(!sprite){
		sprite = SpriteRawCache[key] = SpriteBuildRaw(obj, color)
	}
	return sprite
}

var SpriteRawCache = {}

var SpriteGetRawKey = function(obj, color){
	return color +'_'+ obj.width +'_'+ obj.height +'_'+ obj.shape
}

var SpriteBuildRaw = function(obj, color){
	return new Sprite()
		.set({
			width: obj.width,
			height: obj.height
		})
		.add({
			fillStyle: color,
			shape: obj.shape
		})
}

// size

var SpriteInitSize = function(self) {
	if(self.imgs.length===0) return
	if(self.width === "img") self.width = self.imgs[0].width
	if(self.height === "img") self.height = self.imgs[0].height
}

var SpriteGetMaxSize = function(self) {
	var maxSize = 0, imgs = self.imgs
	if(imgs)
		for(var i=0, len=imgs.length; i<len; ++i) {
			var img = imgs[i]
			if(img.width > maxSize) maxSize = img.width
			if(img.height > maxSize) maxSize = img.height
		}
	return maxSize
}

// add image

SpritePt.add = function(img) {
	if(img.src){
		var cans = SpriteBuildSrcImg(this, img)
		for(var can of cans)
			this.imgs.push(can)
	} else {
		// add canvas image
		var can = SpriteBuildImg(this, img)
		this.imgs.push(can)
		// init size
		if(this.imgs.length===1)
			SpriteInitSize(this)
	}
	return this
}

// get image

SpritePt.getImg = function(n, trans) {
	var imgs=this.imgs,
		nbImgs=imgs.length
	if(nbImgs===0) return null
	n = n % nbImgs
	var img = imgs[n]
//	if(img instanceof HTMLElement === false) {
//		img = this.imgs[n] = SpriteBuildImg(this, img)
//	}
	if(!trans)
		return img
	else {
		var key = SpriteGetTransformKey(this, trans)
		// fetch cache
		var transCache = this.transCache
		if(transCache===undefined) transCache = this.transCache = {}
		var tImgs = this.transCache[key]
		if(tImgs===undefined) tImgs = this.transCache[key] = []
		var tImg = tImgs[n]
		if(tImg===undefined) {
			// if tranformed image does not exist, create it
			tImg = SpriteTransformImage(img, trans)
			tImgs[n] = tImg
		}
		return tImg
	}
}

var SpriteGetTransformKey = function(self, trans) {
	var key = ""
	// width & height
	key += "w"+round(trans.width*self.width)+"_"
	key += "h"+round(trans.height*self.height)+"_"
	// angle
	var ta = trans.ang
	if(ta) {
		var da = 1 / self.cacheRotationStep
		key += "a"+mod(round(ta/da)*da, PI2)+"_"
	}
	return key
}

var SpriteTransformImage = function(img, trans) {
	var width = img.width, height = img.height
	var can = document.createElement("canvas")
	// transform width & height
	var tWidth=trans.width, tHeight=trans.height
	width*=abs(tWidth)
	height*=abs(tHeight)
	// transform angle
	var cWidth=width, cHeight=height
	var ta = trans.ang
	if(ta) {
		var cosA=abs(cos(ta)), sinA=abs(sin(ta))
		var bufWidth=cWidth, bufHeight=cHeight
		cWidth = ceil(cosA*bufWidth + sinA*bufHeight)
		cHeight = ceil(cosA*bufHeight + sinA*bufWidth)
	}
	// ensure cWidth (& cHeight) difference with width (& height) is multiple of 2
	can.width = cWidth = mult(cWidth-width, 2)+width
	can.height = cHeight = mult(cHeight-height, 2)+height
	// draw transformed image
	var ctx = can.getContext("2d")
	ctx.translate(cWidth/2, cHeight/2)
	if(ta) ctx.rotate(ta)
	ctx.scale(sign(tWidth),sign(tHeight))
	ctx.drawImage(img, -width/2, -height/2, width, height)
	// determine position
	can.x = img.x - (cWidth-width)/2
	can.y = img.y - (cHeight-height)/2
	return can
}

// build imgs

var SpriteCtxKeys = [
	"fillStyle",
	"strokeStyle",
	"lineCap",
	"lineDashOffset",
	"lineJoin",
	"lineWidth",
	"shadowBlur",
	"shadowColor",
	"shadowOffsetX",
	"shadowOffsetY",
	"globalAlpha"
]

var SpriteTextCtxKeys = SpriteCtxKeys.concat([
  "font",
  "fontSize"
])

var SpriteBuildImg = function(self, img) {
	// create canvas
	var can = document.createElement("canvas")
	can.x = can.y = 0
	if(img.text !== undefined) SpriteBuildTextImg(self, img, can)
	else SpriteBuildShapeImg(self, img, can)
	return can
}

var SpriteBuildShapeImg = function(self, img, can) {
	// width & height
	var width = img.width
	if(width === undefined) width = self.width
	if(width === "img") width = 30
	var height = img.height
	if(height === undefined) height = self.height
	if(height === "img") height = 30
	can.width = width
	can.height = height
	//shape
	var shape = img.shape
	if(!shape) shape = 'box'
	// fill canvas
	var ctx = can.getContext("2d")
	SpriteFillContext(self, img, ctx)
	if(shape==='box') {
		ctx.rect(0, 0, width, height)
	} else if(shape==='circle') {
		ctx.beginPath()
		ctx.arc(width/2, height/2, width/2, 0, PI2)
	}
	ctx.fill()
}

var SpriteBuildTextImg = function(self, img, can) {
	var ctx = can.getContext("2d"),
		text = img.text
	// get font dimension
	SpriteTextFillContext(self, img, ctx)
	var width = ctx.measureText(text).width
	can.width = width
	can.height = img.fontSize || self.fontSize
	// re-fill context (as canvas size update, reset the context)
	SpriteTextFillContext(self, img, ctx)
	// write text
	ctx.fillText(text, 0, 0)
}

var SpriteFillContext = function(self, img, ctx){
	for(var key of SpriteCtxKeys){
		if(self[key]) ctx[key] = self[key]
		if(img[key]) ctx[key] = img[key]
	}
}
var SpriteTextFillContext = function(self, img, ctx){
	ctx.textBaseline = 'top'
	ctx.textAlign = 'left'
	SpriteFillContext(self, img, ctx)
  var font = img.font || self.font,
    fontSize = img.fontSize || self.fontSize
	ctx.font = fontSize +"px "+ font
}


// load

SpritePt._loadState = LOADED

var SpriteBuildSrcImg = function(self, img){
	var srcs = SpriteEvalSrc(self, img)
	// load images
	var nbImgs = srcs.length
	var imgs = new Array(nbImgs)
	self._loadState = TO_LOAD
	if(self._loadDeps === undefined)
		self._loadDeps = []
	var sprite = this
	for(var i=0, len=nbImgs; i<len; ++i){
		(function(i){
			var img = new Image()
			img._sprite = sprite
			img._src = srcs[i]
			img.load = SpriteImgLoad
			img._loadState = TO_LOAD
			self._loadDeps.push(img)
			imgs[i] = img
		})(i)
	}
	return imgs
}

var SpriteEvalSrc = function(self, img){
	var src=img.src, srcs=src
	if(!isArr(srcs)){
		var nb = img.nb
		if(nb){
			var pad = img.pad
			var begin = img.begin
			if(begin===undefined) begin=1
			var hash = img.hash || '#'
			srcs = []
			for(var i=begin, end=begin+nb; i<end; ++i) {
				var num = i
				if(pad)(pad+num).slice(-pad.length)
				srcs.push(src.replace(hash,num))
			}
		} else {
			srcs = [src]
		}
	}
	return srcs
}

SpritePt.load = function(){
	if(this._loadState === LOADED) return true
	if(this._loadState <= TO_LOAD)
		this._loadState = LOADING
	var loadDeps = this._loadDeps
	if(loadDeps){
		for(var i=0, len=loadDeps.length; i<len; ++i){
			var dep = loadDeps[i]
			if(dep.load()){
				loadDeps.splice(i, 1)
				i--; len--
			}
		}
		if(len === 0){
			this._loadState = LOADED
			SpriteInitSize(this)
			return true
		}
	}
	return false
}

var SpriteImgLoad = function(){
	if(this._loadState === LOADED) return true
	if(this._loadState === TO_LOAD) {
		this._loadState = LOADING
		this.onload = function() {
			this._loadState = LOADED
/*			if(i===0){ // TODO: change
				sprite.width = this.width
				sprite.height = this.height
			} */
		}
		this.onerror = function() {
			this._loadState = LOADED
			console.warn('Could not load image:', this.src)
		}
		this.src = this._src
	}
	return false
}

/*
Object.defineProperty(SpritePt, "src", {
	get(){
		return this._src
	},
	set(src){
		this._src = src
		this._loading = true
	}
})

SpritePt.load = function() {
	if(this._src && !this._loadStarted){
		this._loadStarted = true
		// build srcs
		var src=this._src, srcs=src
		if(!isArr(srcs)){
			var nb = this.nb
			if(nb){
				var pad = this.pad
				var begin = this.begin
				if(begin===undefined) begin=1
				var hash = this.hash || '#'
				srcs = []
				for(var i=begin, end=begin+nb; i<end; ++i) {
					var num = i
					if(pad)(pad+num).slice(-pad.length)
					srcs.push(src.replace(hash,num))
				}
			} else {
				srcs = [src]
			}
		}
		// load images
		var nbImgs = srcs.length
		var imgs = this.imgs = new Array(nbImgs)
		this._loadNb = nbImgs
		var sprite = this
		for(var i=0, len=nbImgs; i<len; ++i){
			(function(i){
				var img = new Image()
				img.onload = function() {
					SpriteImgLoadCallback(sprite)
					if(i===0){
						sprite.width = this.width
						sprite.height = this.height
					}
				}
				img.onerror = function() {
					SpriteImgLoadCallback(sprite)
					console.warn('Could not load image:', srcs[i])
				}
				img.src = srcs[i]
				imgs[i] = img
			})(i)
		}
	}
	// call parent
	return MsgObj.load.call(this)
}

var SpriteImgLoadCallback = function(sprite){
	sprite._loadNb -= 1
	if(sprite._loadNb==0){
		sprite._loading = false
	}
}
*/


// TEXT ///////////////////////////////////////////////

var Text = MSG.Text = class extends Elem {
	constructor(scene, text, args){
		super(scene, args)
		if(text !== undefined) this.text = text
		TextBuildSprite(this)
		TextInitSize(this)
	}
}
var TextPt = Text.prototype

TextPt.size = "sprite"
/*
Object.defineProperty(TextPt, "text", {
	get(){ return this._text },
	set(text){
		this.sprite = new Sprite()
		this._text = text
	}
})
*/
//TextPt.text = "Text"
/*
TextPt.font = "Arial"
TextPt.fontSize = 30

TextPt.fillStyle = "black"
*/
/*
Text.new = function(text, args){
	var newObj = Elem.new.call(this, args)
	if(text !== undefined) newObj.text = text
	newObj.sprite = Sprite.new()
	return newObj
}

Text.onStart = function(parent){
	Elem.onStart.call(this, parent)
	TextBuildSprite(this)
	TextInitSize(this)
}
*/
var TextBuildSprite = function(self){
	var sprite = self.sprite = new Sprite()
	var img = { text: self.text }
	for(var key of SpriteTextCtxKeys)
		if(self[key]) img[key] = self[key]
	sprite.add(img)
}

var TextInitSize = function(self){
	if(self.width === "sprite")
		self.width = self.sprite.width
	if(self.height === "sprite")
		self.height = self.sprite.height
}



// SCENE /////////////////////////////////////////////

var Scene = MSG.Scene = class extends MsgObj {
	constructor(game, args){
		super(args)
		this.game = game
		this.elems = []
		this.newElems = []
		this.teamsElems = {}
		SceneInitSize(this)
		SceneCreateCanvas(this)
		this.addTo(game)
	}
}
var ScenePt = Scene.prototype

//Scene.x = 0
//Scene.y = 0

ScenePt.shape = "box"

ScenePt.size = "100%"

ScenePt.sprite = "white"

// add
ScenePt.add = function(obj) {
  MsgObjAdd.call(this, obj)
	if(obj instanceof Elem) {
		this.newElems.push(obj)
		obj.scene = this
	}
	return this
}

// init size
var SceneInitSize = function(self){
	_SceneInitSize(self, "width")
	_SceneInitSize(self, "height")
}
var _SceneInitSize = function(self, sizeProp){
	var size=self[sizeProp]
	if(typeof size==="string"){
		var len=size.length
		if(size.substring(len-1)==="%"){
			var sizePart=parseFloat(size.substring(0, len-1)/100.0)
			var gameSize=self.game[sizeProp]
			self[sizeProp] = round(gameSize*sizePart)
		}
	}
}

// remove
ScenePt.remove = function(){
	this.removed = true
	for(var el of this.elems)
		el.remove()
}

// create canvas
var SceneCreateCanvas = function(self) {
	// canvas
	var can = self.canvas = document.createElement("canvas")
	can.width = self.width
	can.height = self.height
	self.canvasContext = can.getContext("2d")
}

// process
ScenePt.process = function() {
	if(!this.paused){
		// clear canvas
		this.canvasContext.clearRect(0, 0, this.width, this.height)
		MsgObjDraw(this, this.canvasContext, 0, 0)
		// actions
		MsgObjProcessActions(this)
		if(this.time===0) this.trigger("start")
		// process elements
		SceneProcessElements(this)
	}
	// draw in game canvas
	this.game.canvasContext.drawImage(this.canvas, floor(this.x), floor(this.y))
	// time
	if(!this.paused) MsgObjIncrTime(this)
}

var SceneProcessElements = function(self) {
	var elems = self.elems,
		teamsElems = self.teamsElems,
		newElems = self.newElems

	// remove elements from elems & teamsElems
	for(var i=elems.length-1; i>=0; --i)
		if(elems[i].removed)
			elems.splice(i, 1)
	for(var team in teamsElems){
		var teamElems = teamsElems[team]
		for(var i=teamElems.length-1; i>=0; --i)
			if(teamElems[i].removed)
				teamElems.splice(i, 1)
	}

	// add new elements
	var nlen=newElems.length
	if(nlen > 0) {
		for(var i=0; i<nlen; ++i) {
			var newEl = newElems[i]
			elems.push(newEl)
			// add in teamsElems also
			var elTeams = newEl.teams
			if(elTeams) for(var elTeam of elTeams)
				initArr(teamsElems, elTeam).push(newEl)
		}
		newElems.length=0
		elems.sort(SceneElemSorter)
	}

	// process each elements
	for(var i=0, len=elems.length; i<len; ++i)
		elems[i].process()
}

var SceneElemSorter = function(el1, el2) {
	return el1.layer - el2.layer
}

// mouse

var SceneOnMouseEvent = function(self, type, x, y){
	self.trigger(type, { x:x, y:y })
	// TODO: propagate to elements
}

// pause

ScenePt.pausable = true

ScenePt.paused = false

ScenePt.pause = function(val){
	if(!this.pausable) return
	if(val===undefined) val=true
	this.paused=val
}

var switchPause = function(){
	this.pause(!this.paused)
}
ScenePt.switchPause = switchPause



// MENU /////////////////////////////////////////////

// MenuScene

var MenuScene = MSG.MenuScene = class extends Scene {
	constructor(game, args){
		super(game, args)
		this.sprite = new Sprite()
			.set({ width:this.width, height:this.height })
			.add({ fillStyle:this.color, globalAlpha:this.alpha })
		var titleDy = 0
		if(this.text){
			new Text(this, this.text, { x:this.width/2, y:this.height/2+30 })
			titleDy = -30
		}
		new Text(this, this.title, { fontSize:50, x:this.width/2, y:this.height/2+titleDy })
	}
}
var MenuScenePt = MenuScene.prototype

MenuScenePt.title = "MENU"
MenuScenePt.color = "grey"
MenuScenePt.alpha = 0.3

// LoadingScene

var LoadingScene = MSG.LoadingScene = class extends MenuScene {
	constructor(game){
		super(game, { title:"LOADING", color:"grey", alpha:1 })
	}
}

// PauseScene
/*
var PauseScene = MSG.PauseScene = class extends MenuScene {
	constructor(game, args){
		super(game, args)
		this.add(PauseSceneAct)
		game.pause()
	}
}
var PauseScenePt = PauseScene.prototype

PauseScenePt.pausable = false

PauseScenePt.title = "Pause"
PauseScenePt.text = "Click to continue"

var PauseSceneAct = new Action("click", function(){
	this.game.pause(false)
	this.remove()
})
*/

// GAME /////////////////////////////////////////////

var Game = MSG.Game = class extends MsgObj {
	constructor(el, args){
		super(args)
		if(el === undefined) el = "body"
		this.game = this
		this.scenes = []
		GameInitEl(this, el)
		// start asynchronously
		setTimeout(() => GameStart(this))
	}
}
var GamePt = Game.prototype

GamePt.width = 600
GamePt.height = 400

//Game.fps = 30

//GamePt.nbToLoad = 0

var GameInitEl = function(self, el){
	// determine el
	if(!el) el="body"
	if(typeof el==="string")
		el = document.querySelector(el)
	else if(!el) el = document.body
	self.el = el
	// case el is canvas
	if(el instanceof HTMLCanvasElement){
		self.width = el.width
		self.height = el.height
	}
}

var GameInitScene = function(self){
	//var scenes = initOwnArrMsgObj(game, "scenes")
	var scn = self.scenes[0]
	if(!scn) scn = new Scene(self)
	return scn
}

// add
GamePt.add = function(obj) {
	MsgObjAdd(this, obj)
	if(obj instanceof Elem){
		GameInitScene(this)
			.add(obj)
	}
	if(obj instanceof Scene) {
		this.scenes.push(obj)
	}
	return this
}

// start
var GameStart = function(self) {
	GameCreateCanvas(self)
	GameLoop(self)
}
/*
GamePt.restart = function(){
	// reset time
	this.time = 0
	// reset scenes
	this.scenes.length = 0
	return this
}
*/
// create canvas
var GameCreateCanvas = function(self) {
	var el = self.el
	var elIsCanvas = (el instanceof HTMLCanvasElement)
	// create canvas
	if(elIsCanvas) var can = self.canvas = el
	else var can = self.canvas = document.createElement("canvas")
	var backCan = self.backgroundCanvas = document.createElement("canvas")
	var bufCan = self.bufferCanvas = document.createElement("canvas")
	// size canvas
	can.width = backCan.width = bufCan.width = self.width
	can.height = backCan.height = bufCan.height = self.height
	// get contexts
	self.canvasContext = can.getContext("2d")
	var backCtx = backCan.getContext("2d")
	self.bufferCanvasContext = bufCan.getContext("2d")
	// style
	can.style.border = "1px solid black"
	can.setAttribute("tabindex", "1")
	backCtx.fillStyle = "white"
	backCtx.fillRect(0, 0, backCan.width, backCan.height)
	// events
	self.keydownTimes = {}
	self.keyupTimes = {}
	can.addEventListener("keydown", (evt) => GameKeyDown(self, evt) )
	can.addEventListener("keyup", (evt) => GameKeyUp(self, evt) )
	can.addEventListener("keypress", preventScreenMove)
	GameAddMouseEventListener(self, "click")
	GameAddMouseEventListener(self, "dblclick")
	can.addEventListener("blur", () => self.trigger("blur") )
	// append in html page
	if(!elIsCanvas)
		el.appendChild(can)
}

// mouse

var GameAddMouseEventListener = function(self, type){
  var can = self.canvas
  can.addEventListener(type, (evt) => {
    var rect = can.getBoundingClientRect(),
      x = evt.clientX - rect.left,
      y = evt.clientY - rect.top
    GameOnMouseEvent(self, type, x, y)
  }) 
}

var GameOnMouseEvent = function(self, type, x, y){
//	this.trigger(type, xy)
	// scenes
	var scenes = self.scenes
	for(var i=0, len=scenes.length; i<len; ++i){
		var scn = scenes[i]
    if(!scn.paused && !scn.removed){
			var scnX=scn.x, scnY=scn.y
		  if(x>=scnX && y>=scnY && x<scnX+scn.width && y<scnY+scn.height)
			  SceneOnMouseEvent(scn, type, x-scnX, y-scnY)
    }
	}
}

// key

var ArrowsAndSpaceKeys = [32, 37, 38, 39, 40]

var GameKeyDown = function(self, evt){
	// fill game keydownTimes
	var code = evt.code,
		downTimes = self.keydownTimes,
		downTime = downTimes[code],
		upTime = self.keyupTimes[code]
	if(downTime!==undefined
		&& (upTime===undefined
			|| downTime>upTime))
		return
	downTimes[code] = self.time
	// prevent srceen moving (space and arrow eys)
	preventScreenMove(evt)
}
var GameKeyUp = function(self, evt){
	var code = evt.code
	self.keyupTimes[code] = self.time
}

GamePt.isKeyDown = function(key){
	var downTime = this.keydownTimes[key]
	if(downTime===undefined) return false
	var upTime = this.keyupTimes[key]
	if(upTime===undefined || downTime>upTime)
		return true
	var gameTime = this.time
	return upTime===gameTime
}

GamePt.isKeyDownNow = function(key){
	var downTime = this.keydownTimes[key]
	if(downTime===undefined) return false
	var gameTime = this.time
	return downTime===gameTime
}

GamePt.isKeyUpNow = function(key){
	var upTime = this.keyupTimes[key]
	if(upTime===undefined) return false
	var gameTime = this.time
	return upTime===gameTime
}

var ArrowsAndSpaceKeys = [32, 37, 38, 39, 40]

var preventScreenMove = function(evt){
	if(ArrowsAndSpaceKeys.indexOf(evt.keyCode) > -1)
		evt.preventDefault()
}

// game loop
var GameLoop = function(self) {
	if(self.load())
		self.process()
	setTimeout(() => GameLoop(self), 1000/MSG.fps)
}

GamePt.process = function() {
	MsgObjProcessActions(this)
	if(this.time === 0) this.trigger("start")
	GameProcessScenes(this)
	MsgObjIncrTime(this)
}

var GameProcessScenes = function(self){
	var scenes = self.scenes
	var nbProcessed = 0
	for(var i=0, len=scenes.length; i<len; ++i){
		var scn = scenes[i]
		if(scn.removed){
			scenes.splice(i, 1)
			i--; len--
		}
		if(scn.load()){
			scn.process()
			if(scn!==self.loadingScene) nbProcessed++
		}
	}
	// loading scene
	if(nbProcessed===0){
		if(!self.loadingScene){
			self.loadingScene = new self.LoadingScene(self)
			if(self.loadingScene.load()) self.loadingScene.process()
		}
	} else if(self.loadingScene){
		self.loadingScene.remove()
		self.loadingScene = null
	}
}

GamePt.LoadingScene = LoadingScene

// clear

GamePt.clear = function(){
	for(var scn of this.scenes)
		scn.remove()
	this.scenes.length = 0
}

// pause

GamePt.paused = false

GamePt.pause = function(val){
	if(val===undefined) val=true
	this.paused=val
	// propag to all scenes
	var scenes=this.scenes
	for(var i=0, len=scenes.length; i<len; ++i)
		scenes[i].pause(val)
}

GamePt.switchPause = switchPause

//focus

GamePt.hasFocus = function(){
  return WindowFocused && this.canvas === document.activeElement
}



// window /////////////////////////////////

var WindowFocused = false
window.addEventListener("focus", function() { WindowFocused = true })
window.addEventListener("blur", function() { WindowFocused = false })


// VARIOUS /////////////////////////////////////////////

var _typeof = function(i){
	var t = typeof(i)
	if(t==="object" && i instanceof Array)
		t = "array"
	return t
}

var setArg = function(args, key, val){
	if(args===undefined) args={}
	args[key]=val
	return args
}

var defArg = function(args, key, defVal){
	if(!args) return defVal
	var val = args[key]
	return (val===undefined) ? defVal : val
}

var mult = MSG.mult = function(i, n) {
	return ceil(i/n)*n
}

var mod = MSG.mod = function(i, n) {
	return ((i%n)+n)%n
}

var sign = MSG.sign = function(n) {
	return n===0 ? 0 : ( n>0 ? 1 : -1 )
}

// return iVal boundd by iMin & iMax
var bound = MSG.bound = function(val, iMin, iMax) {
	return max(iMin, min(val, iMax))
}

// compute vector norm
var norm = MSG.norm = function(x, y) {
	return sqrt(x*x+y*y)
}

// return iAngle between [0,2PI[
var normAng = MSG.normAng = function(t) {
	var res = t%PI2
	return (res>=0) ? res : (res+PI2)
}
var normAng2 = MSG.normAng2 = function(a) {
	return ((((a-PI)%PI2)-PI2)%PI2)+PI
}

// return (weighted) average angle
var avgAng = MSG.avgAng = function(a1, a2, weight) {
	if(weight===undefined) weight=0.5
	var da=normAng2(a2-a1)
	return normAng2(a1+da*weight)
}

var getDir = MSG.getDir = function(script) {
	var scripts = document.getElementsByTagName('script')
	for(var i=0, len=scripts.length; i<len; ++i) {
		var src = scripts[i].src
		if(!src) continue
		var srcArr = src.split('/')
		file = srcArr[srcArr.length-1]
		if(file===script)
			return srcArr.slice(0, -1).join('/')
	}
	return null
}

// imports

var isArr = Array.isArray,
	ObjGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor

var abs = Math.abs,
	floor = Math.floor, ceil = Math.ceil, round = Math.round,
	sqrt = Math.sqrt,
	cos = Math.cos, sin = Math.sin,
	PI = Math.PI, PI2 = 2*PI,
	min = Math.min, max = Math.max

}())
