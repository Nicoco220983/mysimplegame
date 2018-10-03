(function(){

// WALL ///////////////////////////////////

var Wall = MSG.Wall = class {
	constructor(x1, y1, x2, y2, args){
		this.x1 = x1
		this.y1 = y1
		this.x2 = x2
		this.y2 = y2
		this.ang = WallCompAng(this)
		this.both = defArg(args, "both", false)
	}
}

MSG.newWalls = function(xys, args) {
	var res = []
	var prevX=null, prevY=null
	for(var i=0, len=xys.length; i<len; i+=2) {
		var x=xys[i], y=xys[i+1]
		if(prevX!==null){
			res.push(new Wall(prevX, prevY, x, y, args))
		}
		prevX=x; prevY=y
	}
	return res
}

var WallCompAng = function(self){
	var a = atan2(self.x1-self.x2, self.y2-self.y1) + PI_2
	a = a % (self.both ? PI : PI_2)
	return a
}

var drawWalls = MSG.drawWalls = function(canvas, walls, args) {
	if(!args) args = { stroke:"red" }
	var ctx = canvas.getContext("2d")
	var prevX=null, prevY=null
	for(var w=0, len=walls.length; w<len; ++w) {
		var wall=walls[w],
			x1=wall.x1, y1=wall.y1,
			x2=wall.x2, y2=wall.y2
		if(x1!==prevX || y1!==prevY){
			if(prevX!==null) drawBlock(ctx, args)
			ctx.beginPath()
			ctx.moveTo(x1, y1)
		}
		ctx.lineTo(x2, y2)
		prevX=x2; prevY=y2
	}
	drawBlock(ctx, args)
}

var drawBlock = function(ctx, args){
	if(args.stroke){
		ctx.lineWidth=1
		ctx.strokeStyle=args.stroke
		ctx.stroke()
	}
	if(args.fill){
		ctx.fillStyle=args.fill
		ctx.fill()
	}
}


// MAP ////////////////////////////////////

var Map = MSG.Map = class {
  constructor(){
    var walls = this.walls = []
    for(var i=0, len=arguments.length; i<len; ++i){
      var wall = arguments[i]
      if(!(wall instanceof Wall))
        
      walls.push(wall)
    }
  }
}
var MapPt = Map.prototype

MapPt.add = function(obj){
  if(obj instanceof Wall)
    this.walls.push(obj)
}

// COLLIDER ///////////////////////////////

var minDistToWall = 0.001

var MapCollider = MSG.MapCollider = class extends MSG.Designer {
	constructor(walls, args){
		var lenArgs = arguments.length
		var lastArg = arguments[lenArgs-1]
		if(typeof lastArg === "object" && lastArg.length === undefined){
			lenArgs--
			super(lastArg)
		} else {
			super()
		}
		this.maps = []
		for(var i=0; i<lenArgs; ++i)
			this.maps.push(arguments[i])
	}
}
var MapColliderProto = MapCollider.prototype

MapColliderProto.rebounce = 0.75
MapColliderProto.rebounceMinSpd = 100

MapColliderProto.friction = 20
MapColliderProto.frictionFun = MSG.genGeoAcc()

MapColliderProto.updASpd = false

MapColliderProto.design = function(el) {
	// add inertia
	el.add(Inertia)

	// fill mapColliders
	if(el.mapColliders===undefined) el.mapColliders = []
	el.mapColliders.push(this)

	// default collision
	if(el.mapCol===undefined) el.mapCol=null

	if(el.mapColSpdX===undefined) el.mapColSpdX=0
	if(el.mapColSpdY===undefined) el.mapColSpdY=0
	//if(el.mapTgtColSpdX===undefined) el.mapTgtColSpdX=0
	//if(el.mapTgtColSpdY===undefined) el.mapTgtColSpdY=0

	// update process speed
	el.processSpeeds = mcProcessSpeeds
}

var _linCol = {}
var _angCol = {}
var _lastCol = {}

var mcProcessSpeeds = function() {
	colClear(_lastCol)
	_mcProcessSpeeds(this, 1, 1, 0)
	if(_lastCol.distToBlock!==null){
		var col = ObjectAssign({}, _lastCol)
		this.trigger("collision", col)
		this.mapCol = col
	} else {
		this.mapCol = null
	}
}

var _blockSpdUpdRes = {}
var _blockSpdUpdCtx = {}
var _mcProcessSpeeds = function(el, remLinPart, remAngPart, it) {
	if(it>=5) return

	// check if collision check is necessary
	var spdX=el.spdX, spdY=el.spdY, angSpd=el.angSpd,
		shape=el.shape
	var testLin=(remLinPart>0 && (spdX!==0 || spdY!==0))
	var testAng=(remAngPart>0 && (angSpd!==0 && shape==="box"))
	if(!testLin && !testAng) return

	// compute colWalls, using fastCheckNoBlock
	var fps=MSG.fps,
		dx=spdX/fps, dy=spdY/fps, da=angSpd/fps,
		remDx=remLinPart*dx, remDy=remLinPart*dy, remDa=remAngPart*da
	var x=el.x, y=el.y, w2=el.width/2, h2=el.height/2, r2=max(w2,h2)*1.42
	var minX = x - r2 + min(0, remDx)
	var maxX = x + r2 + max(0, remDx)
	var minY = y - r2 + min(0, remDy)
	var maxY = y + r2 + max(0, remDy)

	// loop on mapColliders
	colClear(_linCol)
	colClear(_angCol)
	_blockSpdUpdCtx.el = el
	for(var b=0, mcs=el.mapColliders, bLen=mcs.length; b<bLen; ++b){
		var mc = mcs[b]
		_blockSpdUpdCtx.mc = mc
		// loop walls
		for(var m=0, maps=mc.maps, mLen=maps.length; m<mLen; ++m){
			for(var w=0, walls=maps[m], wLen=walls.length; w<wLen; ++w){
				var wall = walls[w]
				_blockSpdUpdCtx.wall = wall
				// fast check if there is no collision
				if(fastCheckNoBlock(minX, maxX, minY, maxY, wall)) {
					// test linear collision
					if(testLin) {
						var linCollide=false, angCollide=false
						switch(shape) {
							case "box": linCollide = getBoxLinCol(_blockSpdUpdCtx, remDx, remDy, _linCol); break
							case "circle": linCollide = getCircleLinCol(_blockSpdUpdCtx, remDx, remDy, _linCol); break
						}
					}
					// test angular collision
					if(testAng) {
						var angCollide = getBoxAngCol(_blockSpdUpdCtx, remDa, _angCol)
					}
				}
			}
		}
	}

	// compute block parts
	var linBlockDist=null
	if(!testLin) var linBlockPart=0
	else {
		var linBlockDist=_linCol.distToBlock
		if(linBlockDist===null) var linBlockPart=remLinPart
		else var linBlockPart=linBlockDist/norm(dx, dy)
	}
	var angBlockDist=null
	if(!testAng) var angBlockPart=0
	else {
		var angBlockDist=_angCol.distToBlock
		if(angBlockDist===null) var angBlockPart=remAngPart
		else var angBlockPart=angBlockDist/abs(da)
	}

	// apply speed (with greatest block part)
	var col=null,
		newRemLinPart=remLinPart, newRemAngPart=remAngPart
	if(linBlockPart>=angBlockPart) {
		el.x += linBlockPart*dx
		el.y += linBlockPart*dy
		newRemLinPart -= linBlockPart
		if(linBlockDist!==null) col=_linCol
	} else {
		el.ang = normAng(el.ang + angBlockPart*da)
		newRemAngPart -= angBlockPart
		if(angBlockDist!==null) col=_angCol
	}

	if(col!==null) {
		var mc=col.mapCollider
		// compute walls angle
		var colA=colCompAng(col)
		// compute block speed updates
		computeBlockSpdUpd(mc, el, col, colA, _blockSpdUpdRes)
		// min dist to wall
		el.x += minDistToWall*cos(colA)
		el.y += minDistToWall*sin(colA)
		// update speed
		el.spdX = spdX + _blockSpdUpdRes.x
		el.spdY = spdY + _blockSpdUpdRes.y
		if(mc.updASpd) el.angSpd = angSpd + _blockSpdUpdRes.ang
		// update _lastCol
		colCopy(col, _lastCol)
	}

	_mcProcessSpeeds(el, newRemLinPart, newRemAngPart, it+1)
}

var fastCheckNoBlock = function(minX, maxX, minY, maxY, wall) {
	var x1=wall.x1, x2=wall.x2
	if(minX>x1 && minX>x2) return false
	if(maxX<x1 && maxX<x2) return false
	var y1=wall.y1, y2=wall.y2
	if(minY>y1 && minY>y2) return false
	if(maxY<y1 && maxY<y2) return false
	return true
}

var getBoxLinCol = function(ctx, esx, esy, linCol) {
	var el=ctx.el, wall=ctx.wall
	var fps = MSG.fps
	var esx=el.spdX/fps, esy=el.spdY/fps
	if(checkDirection(esx, esy, wall)) return false
	var ex=el.x, ey=el.y,
		ew2=el.width/2, eh2=el.height/2,
		ea=el.ang, ecosa=cos(ea), esina=sin(ea),
		ewcosa=ew2*ecosa, ewsina=ew2*esina, ehcosa=eh2*ecosa, ehsina=eh2*esina,
		ex1 = ex - ewcosa + ehsina,
		ex2 = ex + ewcosa + ehsina,
		ex3 = ex + ewcosa - ehsina,
		ex4 = ex - ewcosa - ehsina,
		ey1 = ey - ewsina - ehcosa,
		ey2 = ey + ewsina - ehcosa,
		ey3 = ey + ewsina + ehcosa,
		ey4 = ey - ewsina + ehcosa,
		wx1=wall.x1, wy1=wall.y1, wx2=wall.x2, wy2=wall.y2
	var collide = false
	collide |= getPointColToSeg(ex1, ey1, esx, esy, wx1, wy1, wx2, wy2, false, linCol, ctx)
	collide |= getPointColToSeg(ex2, ey2, esx, esy, wx1, wy1, wx2, wy2, false, linCol, ctx)
	collide |= getPointColToSeg(ex3, ey3, esx, esy, wx1, wy1, wx2, wy2, false, linCol, ctx)
	collide |= getPointColToSeg(ex4, ey4, esx, esy, wx1, wy1, wx2, wy2, false, linCol, ctx)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex1, ey1, ex2, ey2, true, linCol, ctx)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex2, ey2, ex3, ey3, true, linCol, ctx)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex3, ey3, ex4, ey4, true, linCol, ctx)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex4, ey4, ex1, ey1, true, linCol, ctx)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex1, ey1, ex2, ey2, true, linCol, ctx)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex2, ey2, ex3, ey3, true, linCol, ctx)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex3, ey3, ex4, ey4, true, linCol, ctx)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex4, ey4, ex1, ey1, true, linCol, ctx)
	return collide
}

var getCircleLinCol = function(ctx, esx, esy, linCol) {
	var el=ctx.el, wall=ctx.wall
	if(checkDirection(esx, esy, wall)) return false
	var ex=el.x, ey=el.y,
		ew2=el.width/2,
		wa=wall.ang,
		ex1=ex-ew2*cos(wa),
		ey1=ey-ew2*sin(wa),
		wx1=wall.x1, wy1=wall.y1, wx2=wall.x2, wy2=wall.y2
	var collide = false
	collide |= getPointColToSeg(ex1, ey1, esx, esy, wx1, wy1, wx2, wy2, false, linCol, ctx)
	collide |= getPointColToCircle(wx1, wy1, -esx, -esy, ex, ey, ew2, linCol, ctx)
	collide |= getPointColToCircle(wx2, wy2, -esx, -esy, ex, ey, ew2, linCol, ctx)
	return collide
}

var checkDirection = function(esx, esy, wall) {
	if(!wall.both) {
		var wa=wall.ang, esa=atan2(esy, esx)
		if((esa - wa + 7/2*PI)%PI_2 >= PI) return true
	}
	return false
}

var getPointColToSeg = function(Ax, Ay, Asx, Asy, Sx1, Sy1, Sx2, Sy2, invert, linCol, ctx) {
	var dSx12 = Sx1-Sx2, dSy12 = Sy1-Sy2,
		dS12 = norm(dSx12, dSy12),
		dAs = norm(Asx, Asy),
		dSxy12 = Sx1*Sy2 - Sy1*Sx2,
		dAxys = (Ax+Asx)*Ay - (Ay+Asy)*Ax,
		dAxys12 = dSx12*Asy - dSy12*Asx
	if(dAxys12===0 || dAs===0) return false
	var ix = ( dSxy12*Asx - dSx12*dAxys ) / dAxys12,
		iy = ( dSxy12*Asy - dSy12*dAxys ) / dAxys12
	var p12 = ( (Sx1-ix)*dSx12 + (Sy1-iy)*dSy12 ) / dS12
	if(p12<0 || p12>dS12) return false
	// ditance A to Intersection
	var dAI = ( (ix-Ax)*Asx + (iy-Ay)*Asy ) / dAs
	if(dAI<0 || dAI>dAs) return false
	// collision point
	if(!invert){
		var Asa = atan2(Asy, Asx)
		var colx = Ax + dAI*cos(Asa)
		var coly = Ay + dAI*sin(Asa)
	} else {
		var colx = Ax, coly = Ay
	}
	return colUpd(linCol, dAI, colx, coly, ctx)
}

// compute block distance between point A with speed, and circle C
var getPointColToCircle = function(Ax, Ay, Asx, Asy, Cx, Cy, Cw, linCol, ctx) {
	// compute projection point P of center of circle on A-speed line 
	var As = norm(Asx, Asy),
		dAP = ((Cx-Ax)*Asx + (Cy-Ay)*Asy) / As,
		Px = Ax + dAP*Asx/As,
		Py = Ay + dAP*Asy/As
	// compute distance between C and P
	var dPCx = Px - Cx, dPCy = Py - Cy,
		dPC2 = dPCx*dPCx + dPCy*dPCy
	// check if P is inside circle
	var Cw2 = Cw*Cw
	if(dPC2>Cw2) return false
	// determine distance between A and closest intersection point I
	var dPI = sqrt(Cw2 - dPC2),
		dAI = dAP - dPI
	if(dAI<0 || dAI>As) return false
	var Asa = atan2(Asy, Asx)
	var colx = Ax + dAI*cos(Asa)
	var coly = Ay + dAI*sin(Asa)
	return colUpd(linCol, dAI, colx, coly, ctx)
}

var _circleToSegCols = []
var getBoxAngCol = function(ctx, remDa, angCol) {
	var el=ctx.el, wall=ctx.wall
	var wx1=wall.x1, wy1=wall.y1, wx2=wall.x2, wy2=wall.y2
	var ex=el.x, ey=el.y,
		ew2=el.width/2, eh2=el.height/2, er=norm(ew2, eh2),
		ea=el.ang, ecosa=cos(ea), esina=sin(ea),
		ewcosa=ew2*ecosa, ewsina=ew2*esina, ehcosa=eh2*ecosa, ehsina=eh2*esina,
		ex1 = ex - ewcosa + ehsina,
		ex2 = ex + ewcosa + ehsina,
		ex3 = ex + ewcosa - ehsina,
		ex4 = ex - ewcosa - ehsina,
		ey1 = ey - ewsina - ehcosa,
		ey2 = ey + ewsina - ehcosa,
		ey3 = ey + ewsina + ehcosa,
		ey4 = ey - ewsina + ehcosa
//	_circleToSegCols.length=0
	var collide = false
	var dew1x=wx1-ex, dew1y=wy1-ey, dew1=norm(dew1x, dew1y)
	if(dew1<=er) {
		collide |= getCircleToSegCol(ex, ey, dew1, ex1, ey1, ex2, ey2, _angCol, remDa, wx1, wy1, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew1, ex2, ey2, ex3, ey3, _angCol, remDa, wx1, wy1, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew1, ex3, ey3, ex4, ey4, _angCol, remDa, wx1, wy1, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew1, ex4, ey4, ex1, ey1, _angCol, remDa, wx1, wy1, true, ctx)
	}
	var dew2x=wx2-ex, dew2y=wy2-ey, dew2=norm(dew2x, dew2y)
	if(dew2<=er) {
		collide |= getCircleToSegCol(ex, ey, dew2, ex1, ey1, ex2, ey2, _angCol, remDa, wx2, wy2, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew2, ex2, ey2, ex3, ey3, _angCol, remDa, wx2, wy2, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew2, ex3, ey3, ex4, ey4, _angCol, remDa, wx2, wy2, true, ctx)
		collide |= getCircleToSegCol(ex, ey, dew2, ex4, ey4, ex1, ey1, _angCol, remDa, wx2, wy2, true, ctx)
	}
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex1, ey1, false, ctx)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex2, ey2, false, ctx)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex3, ey3, false, ctx)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex4, ey4, false, ctx)
	return collide
}

// check collision of point "M" moving on circle "C" at ang speed "da", with segment "S"
// "invert" will invert moving point & collision point
var getCircleToSegCol = function(Cx, Cy, Cr, Sx1, Sy1, Sx2, Sy2, angCol, da, Mx, My, invert, ctx) {

	var collide = false
	var Sdx=Sx2-Sx1, Sdy=Sy2-Sy1,
		Sdx2=Sdx*Sdx, Sdy2=Sdy*Sdy, Sdxy2=Sdx2+Sdy2
	var SCx1=Sx1-Cx, SCy1=Sy1-Cy, SCx2=Sx2-Cx, SCy2=Sy2-Cy,
		SCd12=(SCx2*SCy1)-(SCx1*SCy2)
	var D2=(Cr*Cr*Sdxy2)-(SCd12*SCd12)
	if(D2<0) return collide
	var D = sqrt(D2)
	var SCdxy=(SCx1*Sdx)+(SCy1*Sdy)
	var t1=(-SCdxy+D)/Sdxy2
	if(t1>=0 && t1<=1) {
		var colx1=Sx1+(t1*Sdx), coly1=Sy1+(t1*Sdy)
		if(invert) collide |= colUpdAng(angCol, da, Cx, Cy, colx1, coly1, Mx, My, ctx)
		else collide |= colUpdAng(angCol, da, Cx, Cy, Mx, My, colx1, coly1, ctx)
	}
	if(D===0) return collide
	var t2=(-SCdxy-D)/Sdxy2
	if(t2>=0 && t2<=1) {
		var colx2=Sx1+(t2*Sdx), coly2=Sy1+(t2*Sdy)
		if(invert) collide |= colUpdAng(angCol, da, Cx, Cy, colx2, coly2, Mx, My, ctx)
		else collide |= colUpdAng(angCol, da, Cx, Cy, Mx, My, colx2, coly2, ctx)
	}
	return collide
}

var colClear = function(col) {
	col.distToBlock = null
	col.mapCollider = null
	col.ang = null
	clearArr(col, "walls")
	clearArr(col, "wallsNbPoints")
	clearArr(col, "points")
}
var clearArr = function(obj, key){
	var arr=obj[key]
	if(arr===undefined) arr=obj[key]=[]
	else arr.length=0
}

var colCopy = function(col1, col2){
	col2.distToBlock = col1.distToBlock
	col2.mapCollider = col1.mapCollider
	col2.ang = col1.ang
	copyArr(col1, col2, "walls")
	copyArr(col1, col2, "wallsNbPoints")
	copyArr(col1, col2, "points")
}
var copyArr = function(obj1, obj2, key){
	var arr1=obj1[key], arr2=obj2[key]
	if(arr1===undefined) arr1=obj1[key]=[]
	if(!arr2) return
	for(var i=0, len=arr1.length; i<len; ++i)
		arr1[i] = arr2[i]
}

var colUpd = function(collision, distToBlock, x, y, ctx) {
	// check if collision is closer than current one
	var colDistToBlock = collision.distToBlock
	if(colDistToBlock!==null && colDistToBlock<distToBlock-0.0001)
		return false
	// case if collision is strictly closer
	var walls=collision.walls,
		wallsNbPoints=collision.wallsNbPoints,
		points=collision.points
	if(colDistToBlock===null || colDistToBlock>distToBlock+0.0001) {
		collision.distToBlock = distToBlock
		points.length = 0
		walls.length = 0
	}
	// update mapCollider
	collision.mapCollider = ctx.mc
	// update walls & wallsNbPoints
	var found=false, wall=ctx.wall
	for(var i=0, len=walls.length; i<len; i++) {
		if(wall===walls[i]){
			found=true
			break
		}
	}
	if(!found){
		walls.push(wall)
		wallsNbPoints.push(0)
	}
	wallsNbPoints[i] += 1
	// update collision points
	var found=false
	for(var i=0, len=points.length; i<len; i+=2) {
		var px=points[i], py=points[i+1]
		if(x===px && y===py) {
			found=true
			break
		}
	}
	if(!found) points.push(x, y)
	return true
}

var colUpdAng = function(angCol, remDa, Cx, Cy, Mx, My, Bx, By, ctx) {
	var a12=normAng(atan2(By-Cy, Bx-Cx)-atan2(My-Cy, Mx-Cx))
	if(remDa>0) { if(remDa<a12) return false }
	else if(remDa<0) {
		a12=PI_2-a12
		if(-remDa<a12) return false
	}
	return colUpd(angCol, a12, Bx, By, ctx)
}
/*
var colUpdWall = function(col, wall, mc) {
	if(col.walls.indexOf(wall)===-1)
		col.walls.push(wall)
	col.mapCollider = mc
}
*/
var _colCompAngWalls = []
var colCompAng = function(col) {
	// get walls with max number of points
	_colCompAngWalls.length = 0
	var walls=col.walls,
		wallsNbPoints=col.wallsNbPoints
	var maxNbPoints = 0
	for(var i=0, len=walls.length; i<len; ++i){
		nbPoints = wallsNbPoints[i]
		if(nbPoints < maxNbPoints) continue
		if(nbPoints > maxNbPoints){
			maxNbPoints = nbPoints
			_colCompAngWalls.length = 0
		}
		_colCompAngWalls.push(walls[i])
	}
	// get avg angle from these walls
	var a = _colCompAngWalls[0].ang
	for(var i=1, len=_colCompAngWalls.length; i<len; ++i)
		a = avgAng(a, _colCompAngWalls[i].ang, 1/(i+1))
	col.ang = a
	return a
}

// block speed updates

var _pointBlockSpdUpdRes = {}
var computeBlockSpdUpd = function(mc, el, col, colA, res) {
	// compute block react
	if(!mc.updASpd) {
		computePointBlockSpdUpd(mc, el, el.spdX, el.spdY, colA, MSG.fps, res)
	} else {
		var spdUpdX=0, spdUpdY=0, angSpdUpd=0
		var elX=el.x, elY=el.y,
			elSpdX=el.spdX, elSpdY=el.spdY, elSpdA=el.angSpd,
			fps=MSG.fps
		// for each collision point
		for(var p=0, points=col.points, nbPoints=points.length/2; p<nbPoints; p+=2) {
			// compute point speed (before collision)
			var pX=points[p], pY=points[p+1],
				epDx=pX-elX, epDy=pY-elY,
				epDist=norm(epDx,epDy), epa=normAng(atan2(epDy, epDx)),
				pSpdX=elSpdX-elSpdA*epDist*sin(epa),
				pSpdY=elSpdY+elSpdA*epDist*cos(epa)
			// compute block collision speed
			computePointBlockSpdUpd(mc, el, pSpdX, pSpdY, colA, fps, _pointBlockSpdUpdRes)
/*			var rSpdUpd=_blockReactRes.spdUpd, rSpdA=_blockReactRes.spdA,
				rSpd=spd*rSpdUpd, rSpdX=rSpd*cos(rSpdA), rSpdY=sin(rSpdA)
*/			var rSpdX=_pointBlockSpdUpdRes.x, rSpdY=_pointBlockSpdUpdRes.y,
				rSpd=norm(rSpdX, rSpdY), rSpdA=atan2(rSpdY, rSpdX)
			// get linear col speed, from projection of col speed on P-E axis
			var pea=epa+PI, rDa=rSpdA-pea,
				rlSpd=rSpd*cos(rDa), rlSpdX=rlSpd*cos(pea), rlSpdY=rlSpd*sin(pea)
			// get angular col speed, from orthogonal projection of col speed on P-E axis
			var raSpdX=rSpdX-rlSpdX, raSpdY=rSpdY-rlSpdY,
				raSpd=norm(raSpdX,raSpdY),
				raDa=normAng(atan2(epDy+raSpdY, epDx+raSpdX)-epa),
				raSpdA=raSpd/epDist*(raDa<=PI?1:-1)
			// add col speeds to total
			spdUpdX+=rlSpdX/nbPoints
			spdUpdY+=rlSpdY/nbPoints
			angSpdUpd+=raSpdA/nbPoints
		}
		res.x=spdUpdX
		res.y=spdUpdY
		res.ang=angSpdUpd
	}
}

var computePointBlockSpdUpd = function(mc, el, spdX, spdY, colA, fps, res){
	var spd=norm(spdX,spdY), spdA=atan2(spdY,spdX)
	// check if there is rebounce
	var rebounce = el.mapRebounce
	if(rebounce===undefined) rebounce = mc.rebounce
	var rebounceMinSpd = el.mapRebounceMinSpd
	if(rebounceMinSpd===undefined) rebounceMinSpd = mc.rebounceMinSpd
	var rebounceSpd = spd*abs(cos(spdA-colA))
	if(rebounce && rebounceSpd>=rebounceMinSpd) {
		// rebounce
		var newSpdA = (2*colA - spdA + 3*PI) % PI_2
		var newSpd=spd*rebounce
		res.x=newSpd*cos(newSpdA)-spdX
		res.y=newSpd*sin(newSpdA)-spdY
	} else {
		// check if there is stop, or friction
		var friction = el.mapFriction
		if(friction===undefined) friction = mc.friction
		/*if(friction===true) var isStop = true
		else {
			var diffA = normAng(spdA-colA),
				frictionA = normAng(colA + ((diffA<=PI) ? PI2 : -PI2)),
				projSpdReduc = abs(cos(spdA-frictionA)),
				newSpd = spd * projSpdReduc
			isStop = (newSpd<mc.frictionMinSpd)
		}*/
		if(friction===true) var frictionDec=Number.MAX_VALUE
		else var frictionDec = (friction===false) ? 0 : friction
		var diffA = normAng(spdA-colA),
			frictionA = normAng(colA + ((diffA<=PI) ? PI2 : -PI2)),
			frictionCosA = cos(frictionA),
			frictionSinA = sin(frictionA),
			projSpdReduc = abs(cos(spdA-frictionA)),
			newSpd = spd * projSpdReduc
		// colAcc
		/*
		var colAcc = el.mapColAcc
		if(!colAcc) var colSpd=0
		else {
			var tgtColSpdX=el.mapTgtColSpdX, tgtColSpdY=el.mapTgtColSpdY
			if(tgtColSpdX===0 && tgtColSpdY===0) var tgtColSpd=0
			else {
				var tgtColSpd = norm(tgtColSpdX, tgtColSpdY),
					tgtColSpdA = atan2(tgtColSpdY, tgtColSpdX),
					tgtColSpdReduc = cos(frictionA-tgtColSpdA)
				tgtColSpd *=  tgtColSpdReduc
				colAcc *= abs(tgtColSpdReduc)
			}
			*/
			var colSpdX=el.mapColSpdX, colSpdY=el.mapColSpdY
			if(colSpdX===0 && colSpdY===0) var colSpd=0
			else {
				var colSpd = norm(colSpdX, colSpdY),
					colSpdA = atan2(colSpdY, colSpdX),
					colSpdReduc = cos(frictionA-colSpdA)
				colSpd *=  colSpdReduc
			}
			/*
			colSpd += accTo(colSpd, tgtColSpd, colAcc, el.mapColAccFun)
			el.mapColSpdX = colSpd * frictionCosA
			el.mapColSpdY = colSpd * frictionSinA
			
		}*/
		// friction
		newSpd += accTo(newSpd, colSpd, frictionDec, mc.frictionFun)
		res.x=newSpd*frictionCosA-spdX
		res.y=newSpd*frictionSinA-spdY
		/* } else {
			// stop
			res.x = -spdX
			res.y = -spdY
		} */
	}
}

// imports

var abs = Math.abs,
	min = Math.min, max =Math.max,
	sqrt = Math.sqrt,
	cos = Math.cos, sin = Math.sin,
	atan2 = Math.atan2,
	PI = Math.PI,
	PI_2 = PI*2,
	PI2 = PI/2

var sign = MSG.sign,
	bound = MSG.bound,
	norm = MSG.norm,
	normAng = MSG.normAng,
	avgAng = MSG.avgAng

var accTo = MSG.accTo,
	Inertia = MSG.Inertia

var ObjectAssign = Object.assign
var isArr = Array.isArray

var defArg = function(args, key, defVal){
	if(!args) return defVal
	var val = args[key]
	return (val===undefined) ? defVal : val
}

}())
