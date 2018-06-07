(function(){

// global vars

MSG = MySimpleGame = {}

MSG.fps = 30

// OBJ /////////////////////////////////////////////

var MsgObj = MSG.Obj = MSG.Object = {}

// new
var ObjCreate = Object.create,
	ObjAssign = Object.assign

var inherits = function(obj1, obj2){
	return obj1===obj2 || obj2.isPrototypeOf(obj1)
}

// inits

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

var initArr = function(obj, prop){
	var arr = obj[prop]
	if(!arr) arr = obj[prop] = []
	return arr
}

var initObj = function(obj, prop){
	var _obj = obj[prop]
	if(!_obj) _obj = obj[prop] = {}
	return _obj
}

// new
var MsgObjNew = MsgObj.new = function(args){
	var newObj = ObjCreate(this)
	ObjAssign(newObj, args)
	return newObj
}

// set
MsgObj.set = function(arg1, arg2) {
	var t = typeof arg1
	if(t==="string") {
		this[arg1] = arg2
	} else if(t==="object") {
		ObjAssign(this, arg1)
	}
	return this
}

// add

MsgObj.addTo = function(obj) {
	obj.add(this)
	return this
}

// load

MsgObj.load = function(){
	// loading
	if(this._loading) return false
	// load deps
	var loadDeps=this._loadDeps
	if(loadDeps!==undefined){
		for(var i=0, len=loadDeps.length; i<len; ++i){
			var depObj = loadDeps[i]
			if(depObj.load()){
				loadDeps.splice(i, 1)
				i--; len--
			}
			else return false
		}
		if(loadDeps.length===0)
			delete this._loadDeps
	}
	return true
}

MsgObj.wait = function(obj){
	if(!obj._loading && !obj._loadDeps) return
	initOwnArr(this, "_loadDeps")
		.push(obj)
}

// start

MsgObj.start = function(parent){
	if(this.started) return
	this.started = true
	initOwnArr(this, "newActions")
	this.onStart(parent)
	this.trigger("start")
	return this
}

MsgObj.onStart = function(){}

// time

MsgObj.time = 0

var _MsgObjIncrTime = function(obj) {
	obj.time += 1/MSG.fps
}

// size

Object.defineProperty(MsgObj, "size", {
	set(size) {
		this.width = size
		this.height = size
	}
})

// sprite

var FIT = MSG.FIT = -1,
	FILL = MSG.FILL = -2

Object.defineProperty(MsgObj, "spriteSize", {
	set(val){
		this.spriteWidth = val
		this.spriteHeight = val
	}
})
MsgObj.spriteSize = FILL

MsgObj.spriteWidthStretch = 1
MsgObj.spriteHeightStretch = 1

MsgObj.spriteSpd = 1
MsgObj.spriteStartTime = 0

var _MsgObjInitSprite = function(obj){
	var sprite = obj.sprite
	if(!sprite) return
	if(inherits(sprite, Sprite)) return
	if(sprite instanceof HTMLElement) return
	var spriteType = typeof sprite
	var spriteArgs = {
		width: obj.width,
		height: obj.height
	}
	var shape = obj.shape
	if(shape!==undefined) spriteArgs.shape = shape
	if(spriteType==="string")
		spriteArgs.style = sprite
	else if(spriteType==="object")
		ObjAssign(spriteArgs, sprite)
	obj.sprite = Sprite.new(spriteArgs)
}

var _MsgObjDraw_spriteTrans = {}
var _MsgObjDraw = function(obj, ctx, x, y){
	var sprite = obj.sprite
	if(!sprite) return
	if(inherits(sprite, Sprite)){
		sprite.start()
		var t = _MsgObjDraw_spriteTrans
		t.a = obj.a
		_MsgObjComputeSpriteSize(obj, sprite, t)
		var numImg = floor((obj.time - obj.spriteStartTime) * obj.spriteSpd)
		var img = sprite.getImage(numImg, t)
		if(img)
			ctx.drawImage(img,
				round(x+img.x),
				round(y+img.y))
	} else {
		ctx.drawImage(sprite, round(x), round(y))
	}
}

var _MsgObjComputeSpriteSize = function(obj, sprite, trans){
	var sw=obj.spriteWidth, sh=obj.spriteHeight
	// null
	if(!sw) trans.width = 1
	if(!sh) trans.height = 1
	// fixed
	if(sw>0) trans.width = sw / sprite.width
	if(sh>0) trans.height = sh / sprite.height
	// FIT & FILL
	if(sw===FIT || sh===FIT || sw===FILL || sh===FILL){
		var er = obj.width / obj.height,
			sr = sprite.width / sprite.height,
			eb = (er > sr)
		if((eb && sw===FIT) || (!eb && sw===FILL))
			trans.width = obj.height / sprite.height
		if((eb && sh===FIT) || (!eb && sh===FILL))
			trans.height = obj.height / sprite.height
		if((eb && sw===FILL) || (!eb && sw===FIT))
			trans.width = obj.width / sprite.width
		if((eb && sh===FILL) || (!eb && sh===FIT))
			trans.height = obj.width / sprite.width
	}
	// stretch
	trans.width *= obj.spriteWidthStretch
	trans.height *= obj.spriteHeightStretch
}

// actions

var Action = {}

MsgObj.act = function(arg1, arg2) {
	// parse args
	if(arg2===undefined) var run=arg1
	else var on=arg1, run=arg2
	// create action
	var action = ObjCreate(Action)
	action.on = on
	action.run = run
	// create newActions (if needed), & fill it
	initOwnArr(this, "newActions")
		.push(action)
}

var _MsgObjProcessActions = function(obj) {
	_MsgObjStartNewActions(obj)
	_MsgObjRunActions(obj)
	_MsgObjRunTimeActions(obj)
}

var _MsgObjStartNewActions = function(obj) {
	var newActions = obj.newActions
	if(!newActions) return
	for(var i=0, len=newActions.length; i<len; ++i)
		_MsgObjActionStart(obj, ObjCreate(newActions[i]))
	newActions.length = 0
}

var _MsgObjActionStart = function(obj, action){
	var startNow=true
	// on
	startNow &= _MsgObjActionInitOn(obj, action, action.on)
	// start
	if(startNow)
		_MsgObjActionStartNormal(obj, action)
}

// on
var _MsgObjActionInitOn = function(obj, action, on){
	var startNow=true
	var onType = _typeof(on)
	if(onType==="array"){
		for(var i=0, len=on.length; i<len; ++i)
			startNow &= _MsgObjActionInitOn(obj, action, on[i])
	} else if(onType==="number"){
		_MsgObjActionStartTime(obj, action, on)
		startNow=false
	} else if(onType==="string"){
		_MsgObjActionStartEvent(obj, action, on)
		startNow=false
	} else if(onType==="object"){
		// deps
		for(var dep in on){
			var depInit=_MsgObjActionDepInits[dep]
			if(depInit!==undefined)
				startNow &= (depInit(obj, on[dep], action) !== false)
		}
		// on
		var on2 = on.on
		if(on2) startNow &= _MsgObjActionInitOn(obj, action, on2)
	}
	return startNow
}

// normal

var _MsgObjActionStartNormal = function(obj, action) {
	if(action.removed || action.started) return
	action.started = true
	initArr(obj, "actions")
		.push(action)
}

Action.stop = function() {
	this.started = false
	return this
}

Action.remove = function() {
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

var _MsgObjActionStartTime = function(obj, action, time) {
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

var _MsgObjActionStartEvent = function(obj, action, evt) {
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

var _MsgObjActionDepInits = {}

var genMsgObjActionDepInit = function(depRun, depStart, targetStartNow){
	return function(obj, on, action){
		var depAction = ObjCreate(Action)
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

_MsgObjActionDepInits.period = function(obj, on, action){
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

_MsgObjActionDepInits.max = function(obj, on, action){
	action.max = on
	action.nbRun = 0
	if(action.baseRun===undefined){
		action.baseRun = action.run
		action.run = _ActionRunComplex
	}
}

// start

var _MsgObjActionStartRun = function(args, action) {
	var targetAction = action.target
	if(targetAction.removed) return action.remove()
	_MsgObjActionStartNormal(this, targetAction)
}

_MsgObjActionDepInits.start = genMsgObjActionDepInit(_MsgObjActionStartRun, _MsgObjActionStart, false)

// stop

var _MsgObjActionStopRun = function(args, action) {
	var targetAction = action.target
	if(targetAction.removed) return action.remove()
	targetAction.started = false
}

_MsgObjActionDepInits.stop = genMsgObjActionDepInit(_MsgObjActionStopRun, _MsgObjActionStart)

// rm

var _MsgObjActionRmRun = function(args, action) {
	action.target.remove()
}

_MsgObjActionDepInits.rm = genMsgObjActionDepInit(_MsgObjActionRmRun, _MsgObjActionStart)

// key

var _MsgObjActionKeyRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyDown(action.on)
})

_MsgObjActionDepInits.key = genMsgObjActionDepInit(_MsgObjActionKeyRun, _MsgObjActionStartNormal, false)

// keydown

var _MsgObjActionKeydownRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyDownNow(action.on)
})

_MsgObjActionDepInits.keydown = genMsgObjActionDepInit(_MsgObjActionKeydownRun, _MsgObjActionStartNormal, false)

// keyup

var _MsgObjActionKeyupRun = genActionCondCallTargetRun(function(action){
	return this.game.isKeyUpNow(action.on)
})

_MsgObjActionDepInits.keyup = genMsgObjActionDepInit(_MsgObjActionKeyupRun, _MsgObjActionStartNormal, false)


// run

var _MsgObjRunActions = function(obj) {
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
var _MsgObjRunTimeActions = function(obj) {
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

MsgObj.trigger = function(evt, args, args2) {
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

var Elem = MSG.Elem = MSG.Element = MsgObj.new()

// add
Elem.add = function(obj, args) {
	if(inherits(obj, Sprite)) {
		if(args!==undefined)
			obj = obj.new(args)
		if(!this.sprite)
			this.sprite = obj
		this.wait(obj)
	}
	if(inherits(obj, Designer)) {
		if(args!==undefined)
			obj = obj.new(args)
		obj.design(this)
	}
	return this
}

// start

Elem.onStart = function(scene){
	this.scene = scene
	this.game = scene.game
	_MsgObjInitSprite(this)
}

// remove
Elem.remove = function() {
	if(!this.removed)
		this.trigger("remove")
	this.removed = true
	return this
}

// x, y, angle
Elem.x = 0
Elem.y = 0
Elem.a = 0

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

// size
Elem.size = 30

// shape
var BOX = MSG.BOX = 0,
	CIRCLE = MSG.CIRCLE = 1
Elem.shape = BOX

// layer
Elem.layer = 0

// process
Elem.process = function() {
	// actions
	_MsgObjProcessActions(this)
	// draw
	_MsgObjDraw(this, this.scene.canvasContext,
		this.x - this.width/2,
		this.y - this.height/2)
	// time
	_MsgObjIncrTime(this)
}



// DESIGNER /////////////////////////////////////////////

var Designer = MSG.Designer = MsgObj.new()

Designer.design = function() {}


// SPRITE /////////////////////////////////////////////

var Sprite = MSG.Sprite = MsgObj.new()

// size
Sprite.size = 10

// shape
Sprite.shape = BOX

// cache variables
Sprite.cacheRotationStep = "auto"

// start
Sprite.onStart = function() {
	_SpriteBuildCanvas(this)
	_SpriteComputeCacheRotationStep(this)
}

var _SpriteBuildCanvas = function(self) {
	if(self.imgs) return
	var img = self.img
	if(img!==undefined) {
		img.x = img.y = 0
		self.imgs = [img]
		self.width = img.width
		self.height = img.height
	} else {
		var can = document.createElement("canvas")
		var width = can.width = self.width
		var height = can.height = self.height
		var ctx = can.getContext("2d")
		ctx.fillStyle = self.style
		var shape = self.shape
		if(shape===BOX) {
			ctx.rect(0, 0, width, height)
		} else if(shape===CIRCLE) {
			ctx.beginPath()
			ctx.arc(width/2, height/2, width/2, 0, PI2)
		}
		ctx.fill()
		can.x = can.y = 0
		self.imgs = [can]
	}
}

var _SpriteComputeCacheRotationStep = function(self) {
	if(self.cacheRotationStep==="auto") {
		var maxSize = _SpriteGetMaxSize(self)
		self.cacheRotationStep = 16 * max(1, maxSize/10)
	}
}

var _SpriteGetMaxSize = function(self) {
	var maxSize = 0, imgs = self.imgs
	if(imgs)
		for(var i=0, len=imgs.length; i<len; ++i) {
			var img = imgs[i]
			if(img.width > maxSize) maxSize = img.width
			if(img.height > maxSize) maxSize = img.height
		}
	return maxSize
}

// get image
Sprite.getImage = function(n, trans) {
	var imgs=this.imgs
	if(!imgs) return null
	var nbImgs=imgs.length
	if(nbImgs===0) return null
	n = n % nbImgs
	if(!trans)
		return imgs[n]
	else {
		var key = this.getTransformKey(trans)
		// fetch cache
		var transCache = this.transCache
		if(transCache===undefined) transCache = this.transCache = {}
		var tImgs = this.transCache[key]
		if(tImgs===undefined) tImgs = this.transCache[key] = []
		var tImg = tImgs[n]
		if(tImg===undefined) {
			// if tranformed image does not exist, create it
			tImg = this.transformImage(imgs[n], trans)
			tImgs[n] = tImg
		}
		return tImg
	}
}

Sprite.getTransformKey = function(trans) {
	var key = ""
	// width & height
	key += "w"+round(trans.width*this.width)+"_"
	key += "h"+round(trans.height*this.height)+"_"
	// angle
	var ta = trans.a
	if(ta) {
		var da = 1 / this.cacheRotationStep
		key += "a"+mod(round(ta/da)*da, PI2)+"_"
	}
	return key
}

Sprite.transformImage = function(img, trans) {
	var width = img.width, height = img.height
	var can = document.createElement("canvas")
	// transform width & height
	var tWidth=trans.width, tHeight=trans.height
	width*=abs(tWidth)
	height*=abs(tHeight)
	// transform angle
	var cWidth=width, cHeight=height
	var ta = trans.a
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

// load

Object.defineProperty(Sprite, "src", {
	get(){
		return this._src
	},
	set(src){
		this._src = src
		this._loading = true
	}
})

Sprite.load = function() {
	if(this._src && !this._loadStarted){
		this._loadStarted = true
		// build srcs
		var src=this.src, srcs=src
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
					_SpriteImgLoadCallback(sprite)
					if(i===0){
						sprite.width = this.width
						sprite.height = this.height
					}
				}
				img.onerror = function() {
					_SpriteImgLoadCallback(sprite)
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
var _SpriteImgLoadCallback = function(sprite){
	sprite._loadNb -= 1
	if(sprite._loadNb==0){
		sprite._loading = false
	}
}


// SCENE /////////////////////////////////////////////

var Scene = MSG.Scene = MsgObj.new()

Scene.x = 0
Scene.y = 0

Scene.size = "100%"

Scene.sprite = "white"

// add
Scene.add = function(obj, args) {
	if(inherits(obj, Elem)) {
		var newObj = obj.new(args)
		initOwnArrMsgObj(this, "newElems")
			.push(newObj)
		this.wait(newObj)
	}
	return this
}

// start
Scene.onStart = function(game) {
	this.game = game
	initOwnArrMsgObj(this, "newElems")
	_SceneInitSize(this)
	_MsgObjInitSprite(this)
	_SceneCreateCanvas(this)
}

// init size
var _SceneInitSize = function(scn){
	_SceneInitSize2(scn, "width")
	_SceneInitSize2(scn, "height")
}
var _SceneInitSize2 = function(scn, sizeProp){
	var size=scn[sizeProp]
	if(typeof size==="string"){
		var len=size.length
		if(size.substring(len-1)==="%"){
			var sizePart=parseFloat(size.substring(0, len-1)/100.0)
			var gameSize=scn.game[sizeProp]
			scn[sizeProp] = round(gameSize*sizePart)
		}
	}
}

// create canvas
var _SceneCreateCanvas = function(scn) {
	// canvas
	var can = scn.canvas = document.createElement("canvas")
	can.width = scn.width
	can.height = scn.height
	scn.canvasContext = can.getContext("2d")
}

// process
Scene.process = function() {
	if(!this.paused){
		// clear canvas
		_MsgObjDraw(this, this.canvasContext, 0, 0)
		// actions
		_MsgObjProcessActions(this)
		// process elements
		_SceneProcessElements(this)
	}
	// draw in game canvas
	this.game.canvasContext.drawImage(this.canvas, floor(this.x), floor(this.y))
	// time
	if(!this.paused) _MsgObjIncrTime(this)
}

var _SceneProcessElements = function(scn) {
	var elems = initArr(scn, "elems"),
		newElems = scn.newElems

	// remove elements
	for(var i=elems.length-1; i>=0; --i) {
		if(elems[i].removed)
			elems.splice(i, 1)
	}

	// add new elements
	var nlen=newElems.length
	if(nlen > 0) {
		for(var i=0; i<nlen; ++i) {
			var newElem = newElems[i]
			elems.push(newElem)
			newElem.start(scn)
		}
		newElems.length=0
		elems.sort(_SceneElemSorter)
	}

	// process each elements
	for(var i=0, len=elems.length; i<len; ++i)
		elems[i].process()
}

var _SceneElemSorter = function(el1, el2) {
	return el1.layer - el2.layer
}

// pause
Scene.paused = false

Scene.pause = function(val){
	if(val===undefined) val=true
	this.paused=val
}

var switchPause = function(){
	this.pause(!this.paused)
}
Scene.switchPause = switchPause


// GAME /////////////////////////////////////////////

var Game = MSG.Game = MsgObj.new()

Game.el = "body"

Game.width = 600
Game.height = 400

Game.fps = 30

Game.nbToLoad = 0

var _GameInitScene = function(game){
	var scenes = initOwnArrMsgObj(game, "scenes")
	var scn = scenes[0]
	if(!scn){
		game.add(Scene)
		scn = scenes[0]
	}
	return scn
}

// add
Game.add = function(obj, args) {
	if(inherits(obj, Elem)) {
		_GameInitScene(this)
			.add(obj, args)
	}
	if(inherits(obj, Scene)) {
		var newObj = obj.new(args)
		initOwnArrMsgObj(this, "scenes")
			.push(newObj)
	}
	return this
}

// start
Game.startNew = function(el) {
	if(this.started) return this
	var newGame = this.new()
	newGame.started = true
	newGame.game = newGame
	newGame.el = el
	initOwnArrMsgObj(newGame, "scenes")
	newGame.createCanvas()
	newGame.loop()
	return newGame
}

Game.restart = function(){
	// reset time
	this.time = 0
	// reset scenes
	delete this.scenes
	initOwnArrMsgObj(this, "scenes")
	return this
}

// create canvas
Game.createCanvas = function() {
	// crate canvas
	var can = this.canvas = document.createElement("canvas")
	var backCan = this.backgroundCanvas = document.createElement("canvas")
	var bufCan = this.bufferCanvas = document.createElement("canvas")
	// size canvas
	can.width = backCan.width = bufCan.width = this.width
	can.height = backCan.height = bufCan.height = this.height
	// get contexts
	this.canvasContext = can.getContext("2d")
	var backCtx = backCan.getContext("2d")
	this.bufferCanvasContext = bufCan.getContext("2d")
	// style
	can.style.border = "1px solid black"
	can.setAttribute("tabindex", "1")
	backCtx.fillStyle = "white"
	backCtx.fillRect(0, 0, backCan.width, backCan.height)
	// events
	this.keydownTimes = {}
	this.keyupTimes = {}
	can.addEventListener("keydown", (evt) => _GameKeyDown(this, evt) )
	can.addEventListener("keyup", (evt) => _GameKeyUp(this, evt) )
	// append in html page
	var el = this.el
	if(!el) el="body"
	if(typeof el==="string")
		el = document.querySelector(el)
	else if(!el) el = document.body
	el.appendChild(can)
}
var _GameKeyDown = function(game, evt){
	var code = evt.code,
		downTimes = game.keydownTimes,
		downTime = downTimes[code],
		upTime = game.keyupTimes[code]
	if(downTime!==undefined
		&& (upTime===undefined
			|| downTime>upTime))
		return
	downTimes[code] = game.time
}
var _GameKeyUp = function(game, evt){
	var code = evt.code
	game.keyupTimes[code] = game.time
}

Game.isKeyDown = function(key){
	var downTime = this.keydownTimes[key]
	if(downTime===undefined) return false
	var upTime = this.keyupTimes[key]
	if(upTime===undefined || downTime>upTime)
		return true
	var gameTime = this.time
	return upTime===gameTime
}

Game.isKeyDownNow = function(key){
	var downTime = this.keydownTimes[key]
	if(downTime===undefined) return false
	var gameTime = this.time
	return downTime===gameTime
}

Game.isKeyUpNow = function(key){
	var upTime = this.keyupTimes[key]
	if(upTime===undefined) return false
	var gameTime = this.time
	return upTime===gameTime
}

// game loop
Game.loop = function() {
	this.process()
	setTimeout(() => this.loop(), 1000/MSG.fps)
}

Game.process = function() {
	_MsgObjProcessActions(this)
	_GameProcessScenes(this)
	_MsgObjIncrTime(this)
}

var _GameProcessScenes = function(game){
	var scenes = game.scenes
	for(var i=0, len=scenes.length; i<len; ++i){
		var scn = scenes[i]
		if(scn.load()){
			scn.start(game)
			scn.process()
		}
	}
}

// pause

Game.paused = false

Game.pause = function(val){
	if(val===undefined) val=true
	this.paused=val
	// propag to all scenes
	var scenes=this.scenes
	for(var i=0, len=scenes.length; i<len; ++i)
		scenes[i].pause(val)
}

Game.switchPause = switchPause



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
