(function(){

var minDistToWall = 0.001

var MapCollider = MSG.MapCollider = MSG.Designer.new()

MapCollider.rebounce = 0.75
MapCollider.rebounceMinSpd = 100

MapCollider.friction = 20
MapCollider.frictionFun = MSG.genGeoAcc()

MapCollider.updASpd = false

MapCollider.design = function(el) {
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

var _linCol = {
	points: [],
	walls: []
}

var _angCol = {
	points: [],
	walls: []
}

var _lastCol=null

var mcProcessSpeeds = function() {
	_lastCol=null
	_mcProcessSpeeds(this, 1, 1, 0)
	if(_lastCol!==null){
		var col = ObjectAssign(_lastCol)
		this.trigger("collision", col, _lastCol)
		this.mapCol = col
	} else {
		this.mapCol = null
	}
}

var _blockSpdUpdRes = {}
var _mcProcessSpeeds = function(el, remLinPart, remAngPart, it) {
	if(it>=5) return
	// check if collision check is necessary
	var spdX=el.spdX, spdY=el.spdY, aSpd=el.aSpd,
		shape=el.shape
	var testLin=(remLinPart>0 && (spdX!==0 || spdY!==0))
	var testAng=(remAngPart>0 && (aSpd!==0 && shape===BOX))
	if(!testLin && !testAng) return
	// compute colWalls, using fastCheckNoBlock
	var fps=el.game.fps,
		dx=spdX/fps, dy=spdY/fps, da=aSpd/fps,
		remDx=remLinPart*dx, remDy=remLinPart*dy, remDa=remAngPart*da
	var x=el.x, y=el.y, w2=el.width/2, h2=el.height/2, r2=max(w2,h2)*1.42
	var minX = x - r2 + min(0, remDx)
	var maxX = x + r2 + max(0, remDx)
	var minY = y - r2 + min(0, remDy)
	var maxY = y + r2 + max(0, remDy)
	// loop on mapColliders
	colClear(_linCol)
	colClear(_angCol)
	for(var b=0, mcs=el.mapColliders, bLen=mcs.length; b<bLen; ++b){
		// loop walls
		for(var m=0, maps=mcs[b].maps, mLen=maps.length; m<mLen; ++m){
			for(var w=0, walls=maps[m], wLen=walls.length; w<wLen; ++w){
				var wall = walls[w]
				// fast check if there is no collision
				if(fastCheckNoBlock(minX, maxX, minY, maxY, wall)) {
					// test linear collision
					if(testLin) {
						var linCollide=false, angCollide=false
						switch(shape) {
							case BOX: linCollide = getBoxLinCol(el, remDx, remDy, wall, _linCol); break
							case CIRCLE: linCollide = getCircleLinCol(el, remDx, remDy, wall, _linCol); break
						}
						if(linCollide) colUpdWall(_linCol, wall, mcs[b])
					}
					// test angular collision
					if(testAng) {
						var angCollide = getBoxAngCol(el, remDa, wall, _angCol)
						if(angCollide) colUpdWall(_angCol, wall, mcs[b])
					}
				}
			}
		}
	}
	// compute block parts
	if(!testLin) var linBlockPart=0
	else {
		var linBlockDist=_linCol.distToBlock
		if(linBlockDist===null) var linBlockPart=remLinPart
		else var linBlockPart=linBlockDist/norm(dx, dy)
	}
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
		el.a = normAng(el.a + angBlockPart*da)
		newRemAngPart -= angBlockPart
		if(angBlockDist!==null) col=_angCol
	}

	if(col!==null) {
		var mc=col.mapCollider
		// compute walls angle
		var wallsA=colUpdWallsA(col)
		// compute block speed updates
		computeBlockSpdUpd(mc, el, col, wallsA, _blockSpdUpdRes)
		// min dist to wall
		el.x += minDistToWall*cos(wallsA)
		el.y += minDistToWall*sin(wallsA)
		// update speed
		el.spdX = spdX + _blockSpdUpdRes.x
		el.spdY = spdY + _blockSpdUpdRes.y
		if(mc.updASpd) el.aSpd = aSpd + _blockSpdUpdRes.a
		// update _lastCol
		_lastCol=col
	}

	_mcProcessSpeeds(el, newRemLinPart, newRemAngPart, it+1)
}

var fastCheckNoBlock = function(minX, maxX, minY, maxY, wall) {
	var end1=wall.end1, end2=wall.end2
	var x1=end1.x, x2=end2.x
	if(minX>x1 && minX>x2) return false
	if(maxX<x1 && maxX<x2) return false
	var y1=end1.y, y2=end2.y
	if(minY>y1 && minY>y2) return false
	if(maxY<y1 && maxY<y2) return false
	return true
}

var getBoxLinCol = function(el, esx, esy, wall, linCol) {
	var fps = el.game.fps
	var esx=el.spdX/fps, esy=el.spdY/fps
	if(checkDirection(esx, esy, wall)) return false
	var ex=el.x, ey=el.y,
		ew2=el.width/2, eh2=el.height/2,
		ea=el.a, ecosa=cos(ea), esina=sin(ea),
		ewcosa=ew2*ecosa, ewsina=ew2*esina, ehcosa=eh2*ecosa, ehsina=eh2*esina,
		ex1 = ex - ewcosa + ehsina,
		ex2 = ex + ewcosa + ehsina,
		ex3 = ex + ewcosa - ehsina,
		ex4 = ex - ewcosa - ehsina,
		ey1 = ey - ewsina - ehcosa,
		ey2 = ey + ewsina - ehcosa,
		ey3 = ey + ewsina + ehcosa,
		ey4 = ey - ewsina + ehcosa,
		end1=wall.end1, end2=wall.end2,
		wx1=end1.x, wy1=end1.y, wx2=end2.x, wy2=end2.y
	var collide = false
	collide |= getPointColToSeg(ex1, ey1, esx, esy, wx1, wy1, wx2, wy2, false, linCol)
	collide |= getPointColToSeg(ex2, ey2, esx, esy, wx1, wy1, wx2, wy2, false, linCol)
	collide |= getPointColToSeg(ex3, ey3, esx, esy, wx1, wy1, wx2, wy2, false, linCol)
	collide |= getPointColToSeg(ex4, ey4, esx, esy, wx1, wy1, wx2, wy2, false, linCol)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex1, ey1, ex2, ey2, true, linCol)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex2, ey2, ex3, ey3, true, linCol)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex3, ey3, ex4, ey4, true, linCol)
	collide |= getPointColToSeg(wx1, wy1, -esx, -esy, ex4, ey4, ex1, ey1, true, linCol)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex1, ey1, ex2, ey2, true, linCol)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex2, ey2, ex3, ey3, true, linCol)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex3, ey3, ex4, ey4, true, linCol)
	collide |= getPointColToSeg(wx2, wy2, -esx, -esy, ex4, ey4, ex1, ey1, true, linCol)
	return collide
}

var getCircleLinCol = function(el, esx, esy, wall, linCol) {
	if(checkDirection(esx, esy, wall)) return false
	var ex=el.x, ey=el.y,
		ew2=el.width/2,
		wa=wall.a,
		ex1=ex-ew2*cos(wa),
		ey1=ey-ew2*sin(wa),
		end1=wall.end1, end2=wall.end2,
		wx1=end1.x, wy1=end1.y, wx2=end2.x, wy2=end2.y
	var collide = false
	collide |= getPointColToSeg(ex1, ey1, esx, esy, wx1, wy1, wx2, wy2, false, linCol)
	collide |= getPointColToCircle(wx1, wy1, -esx, -esy, ex, ey, ew2, linCol)
	collide |= getPointColToCircle(wx2, wy2, -esx, -esy, ex, ey, ew2, linCol)
	return collide
}

var checkDirection = function(esx, esy, wall) {
	if(!wall.both) {
		var wa=wall.a, esa=atan2(esy, esx)
		if((esa - wa + 7/2*PI)%PI_2 >= PI) return true
	}
	return false
}

var getPointColToSeg = function(Ax, Ay, Asx, Asy, Sx1, Sy1, Sx2, Sy2, invert, linCol) {
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
	var dAI = ( (ix-Ax)*Asx + (iy-Ay)*Asy ) / dAs
	if(invert) dAI = dAs-dAI
	if(dAI<0 || dAI>dAs) return false
	var Asa = atan2(Asy, Asx)
	var colx = Ax + dAI*cos(Asa)
	var coly = Ay + dAI*sin(Asa)
	return colUpd(linCol, dAI, colx, coly)
}

// compute block distance between point A with speed, and circle C
var getPointColToCircle = function(Ax, Ay, Asx, Asy, Cx, Cy, Cw, linCol) {
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
	return colUpd(linCol, dAI, colx, coly)
}

var _circleToSegCols = []
var getBoxAngCol = function(el, remDa, wall, angCol) {
	var end1=wall.end1, end2=wall.end2,
		wx1=end1.x, wy1=end1.y, wx2=end2.x, wy2=end2.y
	var ex=el.x, ey=el.y,
		ew2=el.width/2, eh2=el.height/2, er=norm(ew2, eh2),
		ea=el.a, ecosa=cos(ea), esina=sin(ea),
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
		collide |= getCircleToSegCol(ex, ey, dew1, ex1, ey1, ex2, ey2, _angCol, remDa, wx1, wy1, true)
		collide |= getCircleToSegCol(ex, ey, dew1, ex2, ey2, ex3, ey3, _angCol, remDa, wx1, wy1, true)
		collide |= getCircleToSegCol(ex, ey, dew1, ex3, ey3, ex4, ey4, _angCol, remDa, wx1, wy1, true)
		collide |= getCircleToSegCol(ex, ey, dew1, ex4, ey4, ex1, ey1, _angCol, remDa, wx1, wy1, true)
	}
	var dew2x=wx2-ex, dew2y=wy2-ey, dew2=norm(dew2x, dew2y)
	if(dew2<=er) {
		collide |= getCircleToSegCol(ex, ey, dew2, ex1, ey1, ex2, ey2, _angCol, remDa, wx2, wy2, true)
		collide |= getCircleToSegCol(ex, ey, dew2, ex2, ey2, ex3, ey3, _angCol, remDa, wx2, wy2, true)
		collide |= getCircleToSegCol(ex, ey, dew2, ex3, ey3, ex4, ey4, _angCol, remDa, wx2, wy2, true)
		collide |= getCircleToSegCol(ex, ey, dew2, ex4, ey4, ex1, ey1, _angCol, remDa, wx2, wy2, true)
	}
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex1, ey1, false)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex2, ey2, false)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex3, ey3, false)
	collide |= getCircleToSegCol(ex, ey, er, wx1, wy1, wx2, wy2, _angCol, remDa, ex4, ey4, false)
	return collide
}

// check collision of point "M" moving on circle "C" at ang speed "da", with segment "S"
// "invert" will invert moving point & collision point
var getCircleToSegCol = function(Cx, Cy, Cr, Sx1, Sy1, Sx2, Sy2, angCol, da, Mx, My, invert) {

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
		if(invert) collide |= colUpdAng(angCol, da, Cx, Cy, colx1, coly1, Mx, My)
		else collide |= colUpdAng(angCol, da, Cx, Cy, Mx, My, colx1, coly1)
	}
	if(D===0) return collide
	var t2=(-SCdxy-D)/Sdxy2
	if(t2>=0 && t2<=1) {
		var colx2=Sx1+(t2*Sdx), coly2=Sy1+(t2*Sdy)
		if(invert) collide |= colUpdAng(angCol, da, Cx, Cy, colx2, coly2, Mx, My)
		else collide |= colUpdAng(angCol, da, Cx, Cy, Mx, My, colx2, coly2)
	}
	return collide
}

var colClear = function(col) {
	col.distToBlock = null
	col.mapCollider = null
	col.walls.length = 0
	col.points.length = 0
}

var colUpd = function(collision, distToBlock, x, y) {
	// check if collision is closer than current one
	var colDistToBlock = collision.distToBlock
	if(colDistToBlock!==null && colDistToBlock<distToBlock-0.0001)
		return false
	// case if collision is strictly closer
	var points = collision.points
	if(colDistToBlock===null || colDistToBlock>distToBlock+0.0001) {
		collision.distToBlock = distToBlock
		points.length = 0
		collision.walls.length = 0
	}
	// update collision points
	var found=false
	for(var i=0, len=points.length/2; i<len; i+=2) {
		var px=points[i], py=points[i+1]
		if(x===px && y===py) {
			found=true
			break
		}
	}
	if(!found) points.push(x, y)
	return true
}

var colUpdAng = function(angCol, remDa, Cx, Cy, Mx, My, Bx, By) {
	var a12=normAng(atan2(By-Cy, Bx-Cx)-atan2(My-Cy, Mx-Cx))
	if(remDa>0) { if(remDa<a12) return false }
	else if(remDa<0) {
		a12=PI_2-a12
		if(-remDa<a12) return false
	}
	return colUpd(angCol, a12, Bx, By)
}

var colUpdWall = function(col, wall, mc) {
	if(col.walls.indexOf(wall)===-1)
		col.walls.push(wall)
	col.mapCollider = mc
}

var colUpdWallsA = function(col) {
	var walls=col.walls
	if(walls.length==1) var a=walls[0].a
	else var a=avgAng(walls[0].a, walls[1].a)
	col.wallsA=a
	return a
}

// block speed updates

var _pointBlockSpdUpdRes = {}
var computeBlockSpdUpd = function(mc, el, col, wallsA, res) {
	// compute block react
	if(!mc.updASpd) {
		computePointBlockSpdUpd(mc, el, el.spdX, el.spdY, wallsA, el.game.fps, res)
	} else {
		var spdUpdX=0, spdUpdY=0, aSpdUpd=0
		var elX=el.x, elY=el.y,
			elSpdX=el.spdX, elSpdY=el.spdY, elSpdA=el.aSpd,
			fps=el.game.fps
		// for each collision point
		for(var p=0, points=col.points, nbPoints=points.length/2; p<nbPoints; p+=2) {
			// compute point speed (before collision)
			var pX=points[p], pY=points[p+1],
				epDx=pX-elX, epDy=pY-elY,
				epDist=norm(epDx,epDy), epa=normAng(atan2(epDy, epDx)),
				pSpdX=elSpdX-elSpdA*epDist*sin(epa),
				pSpdY=elSpdY+elSpdA*epDist*cos(epa)
			// compute block collision speed
			computePointBlockSpdUpd(mc, el, pSpdX, pSpdY, wallsA, fps, _pointBlockSpdUpdRes)
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
			aSpdUpd+=raSpdA/nbPoints
		}
		res.x=spdUpdX
		res.y=spdUpdY
		res.a=aSpdUpd
	}
}

var computePointBlockSpdUpd = function(mc, el, spdX, spdY, wallsA, fps, res){
	var spd=norm(spdX,spdY), spdA=atan2(spdY,spdX)
	// check if there is rebounce
	var rebounce = el.mapRebounce
	if(rebounce===undefined) rebounce = mc.rebounce
	var rebounceMinSpd = el.mapRebounceMinSpd
	if(rebounceMinSpd===undefined) rebounceMinSpd = mc.rebounceMinSpd
	var rebounceSpd = spd*abs(cos(spdA-wallsA))
	if(rebounce && rebounceSpd>=rebounceMinSpd) {
		// rebounce
		var newSpdA = (2*wallsA - spdA + 3*PI) % PI_2
		var newSpd=spd*rebounce
		res.x=newSpd*cos(newSpdA)-spdX
		res.y=newSpd*sin(newSpdA)-spdY
	} else {
		// check if there is stop, or friction
		var friction = el.mapFriction
		if(friction===undefined) friction = mc.friction
		/*if(friction===true) var isStop = true
		else {
			var diffA = normAng(spdA-wallsA),
				frictionA = normAng(wallsA + ((diffA<=PI) ? PI2 : -PI2)),
				projSpdReduc = abs(cos(spdA-frictionA)),
				newSpd = spd * projSpdReduc
			isStop = (newSpd<mc.frictionMinSpd)
		}*/
		if(friction===true) var frictionDec=Number.MAX_VALUE
		else var frictionDec = (friction===false) ? 0 : friction
		var diffA = normAng(spdA-wallsA),
			frictionA = normAng(wallsA + ((diffA<=PI) ? PI2 : -PI2)),
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

var BOX = MSG.BOX,
	CIRCLE = MSG.CIRCLE

var accTo = MSG.accTo,
	Inertia = MSG.Inertia

var ObjectAssign = Object.assign

}())
