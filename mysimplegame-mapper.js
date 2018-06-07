(function(){

var maxErr = 50

var Mapper = MSG.Mapper = MSG.Obj.new()

var map = Mapper.map = function(canvas) {
	// get canvas
	if(typeof canvas==="string")
		canvas = document.querySelector(canvas)
	// get image data
console.time("get data")
	var width = canvas.width, height = canvas.height
	var ctx = canvas.getContext("2d")
	var imgData = ctx.getImageData(0, 0, width, height)
	var data = imgData.data
	var isValid = function(x, y) {
		if(x<0 || x>=width) return false
		if(y<0 || y>=height) return false
		return true
	}
console.timeEnd("get data")
	// create solid pixels
console.time("create solids")
	var is_solid = createSolids(data)
	var isSolid = function(x, y) {
		return isValid(x, y) && is_solid[x+y*width]
	}
console.timeEnd("create solids")
	// create border pixels
console.time("create borders")
	var res = createBorders(width, height, data, is_solid)
	var is_border=res[0], borders=res[1]
	var isBorder = function(x, y) {
		return isValid(x, y) && is_border[x+y*width]
	}
console.timeEnd("create borders")
	// create walls
console.time("create walls")
	var res = createWalls(width, height, is_border, borders, isSolid, isBorder)
	var walls=res[0], mergeableBorders=res[1]
console.timeEnd("create walls")
	// merge walls
console.time("exact merge")
	exactMergeWalls(walls, mergeableBorders)
console.timeEnd("exact merge")
console.time("approx merge")
	approxMergeWalls(walls, mergeableBorders)
console.timeEnd("approx merge")
console.time("reorder")
	reorderWalls(walls)
console.timeEnd("reorder")
	return walls
}

var drawWalls = Mapper.drawWalls = function(canvas, walls, args) {
	if(!args) args = { stroke:"red" }
	var ctx = canvas.getContext("2d")
	var prevX=null, prevY=null
	for(var w=0, len=walls.length; w<len; ++w) {
		var end1=walls[w].end1, x1=end1.x, y1=end1.y,
			end2=walls[w].end2, x2=end2.x, y2=end2.y
		if(x1!==prevX || y1!==prevY){
			if(prevX!==null) drawBlock(ctx, args)
			ctx.moveTo(x1, y1)
			ctx.beginPath()
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

// solids

var createSolids = function(data) {
	var is_solid=[]
	for(var i=0, len=data.length/4; i<len; i++) {
		var i4=i*4, r=data[i4], g=data[i4+1], b=data[i4+2]
		is_solid[i] = (r===0 && g===0 && b===0)
	}
	return is_solid
}

// borders

var createBorder = function(i, x, y) {
	return {
		i: i, x: x, y: y,
		walls: []
	}
}

var createBorders = function(w, h, data, is_solid) {
	var is_border=[], borders=[],
		maxX=w-1, maxY=h-1
	for(var i=0, len=w*h; i<len; ++i) {
		var border = null
		if(is_solid[i]) {
			var x=i%w, y=(i-x)/w
			if((x===0 || !is_solid[i-1]) ||
				(x===maxX || !is_solid[i+1]) ||
				(y===0 || !is_solid[i-w]) ||
				(y===maxY || !is_solid[i+w]))
					border = createBorder(i, x, y)
		}
		is_border[i] = border
		if(border!==null) borders.push(border)
	}
	return [is_border, borders]
}

// walls

var getToward = function(t1, t2) {
	if(t1)
		return t2 ? 3 : 1
	else
		return t2 ? 2 : 0
}

var createWalls = function(w, h, is_border, borders, isSolid, isBorder) {
	var walls = [], n = 0
	for(var b=0, len=borders.length; b<len; ++b) {
		var border = borders[b], i = border.i
		var x=i%w, y=(i-x)/w
		// create walls
		// -
		if(isBorder(x-1, y) && (!isBorder(x-1, y-1) || !isBorder(x-1, y+1))) {
			var dir1 = !(isSolid(x-1, y+1) && isSolid(x, y+1)),
				dir2 = !(isSolid(x-1, y-1) && isSolid(x, y-1))
			_createWall1(walls, is_border[i], is_border[i-1], dir1, dir2, PI2, PI6)
		}
		// |
		if(isBorder(x, y-1) && (!isBorder(x-1, y-1) || !isBorder(x+1, y-1))) {
			var dir1 = !(isSolid(x-1, y-1) && isSolid(x-1, y)),
				dir2 = !(isSolid(x+1, y-1) && isSolid(x+1, y))
			_createWall1(walls, is_border[i], is_border[i-w], dir1, dir2, PI4, PI0)
		}
		// \
		if(isBorder(x-1, y-1) && (!isBorder(x-1, y) || !isBorder(x, y-1))) {
			var dir1 = !isSolid(x-1, y),
				dir2 = !isSolid(x, y-1)
			_createWall1(walls, is_border[i], is_border[i-w-1], dir1, dir2, PI3, PI7)
		}
		// /
		if(isBorder(x+1, y-1) && (!isBorder(x, y-1) || !isBorder(x+1, y))) {
			var dir1 = !isSolid(x, y-1),
				dir2 = !isSolid(x+1, y)
			_createWall1(walls, is_border[i], is_border[i-w+1], dir1, dir2, PI5, PI1)
		}
	}
	var mergeableBorders = buildMergeableBorders(borders)
	return [walls, mergeableBorders]
}

var PI = Math.PI,
	PI0 = 0,
	PI1 = 1*PI/4,
	PI2 = 2*PI/4,
	PI3 = 3*PI/4,
	PI4 = 4*PI/4,
	PI5 = 5*PI/4,
	PI6 = 6*PI/4,
	PI7 = 7*PI/4,
	PI_2 = 2*PI

var _createWall1 = function(walls, border1, border2, dir1, dir2, a1, a2) {
	if(dir1 && dir2)
		_createWall2(walls, border1, border2, a2, true)
	else if(dir1)
		_createWall2(walls, border1, border2, a1, false)
	else if(dir2)
		_createWall2(walls, border2, border1, a2, false)
}

var Wall = MSG.Wall = MSG.Obj.new()

Wall.both = false

var _createWall2 = function(walls, end1, end2, a, both) {
	// create wall
	var wall = Wall.new({
		end1: end1, end2: end2,
		inners: [],
		a: a,
		both: both
	})
	// link
	end1.walls.push(wall)
	end2.walls.push(wall)
	walls.push(wall)
}

var buildMergeableBorders = function(borders) {
	var mergeableBorders = []
	for(var b=0, len=borders.length; b<len; ++b) {
		var border = borders[b], walls = border.walls
		if(walls.length!==2) continue
		var wall1=walls[0], wall2=walls[1]
		if(wall1.both!==wall2.both) continue
		if(!wall1.both
			&& wall1.end1!==wall2.end2
			&& wall1.end2!==wall2.end1)
				continue
		mergeableBorders.push(border)
	}
	return mergeableBorders
}

var exactMergeWalls = function(walls, mergeableBorders) {
	// loop on border ends
	for(var b=0, len=mergeableBorders.length; b<len; ++b) {
		var border = mergeableBorders[b], walls = border.walls
		if(walls[0].a===walls[1].a) {
			mergeBorder(mergeableBorders, b)
			b--; len--
		}
	}
	doRemoveWalls(walls)
}

var mergeBorder = function(mergeableBorders, i) {
	var border = mergeableBorders[i], walls=border.walls
	var walla=walls[0], wallb=walls[1]
	if(walla.both) {
		// both dir, there is no end1-end2 ordering
		var wall1=walla, wall2=wallb
		var end2 = (border===wall2.end1) ? wall2.end2 : wall2.end1
		if(wall1.end1===border) wall1.end1 = end2
		else wall1.end2 = end2
	} else {
		// not both dir, we must keep end1-end2 ordering
		if(border===walla.end2) var wall1=walla, wall2=wallb
		else var wall1=wallb, wall2=walla
		var end2 = wall1.end2 = wall2.end2
	}
	// update border walls
	var bwalls = border.walls
	bwalls[0] = wall1
	bwalls.length = 1
	// update end2 walls
	replaceInArr(end2.walls, wall2, wall1)
	// update wall1 inners
	var inners1=wall1.inners, inners2=wall2.inners
	inners1.push(border)
	for(var b=0, len=inners2.length; b<len; ++b) {
		var border2 = inners2[b]
		inners1.push(border2)
		// update border2 walls
		var b2walls = border2.walls
		b2walls[0] = wall1
		b2walls.length = 1
	}
	// remove wall2
	wall2.removed = true
	mergeableBorders.splice(i, 1)
}

var doRemoveWalls = function(walls) {
	for(var w=0, len=walls.length; w<len; ++w) {
		if(walls[w].removed) {
			walls.splice(w, 1)
			w--; len--
		}
	}
}

var approxMergeWalls = function(walls, mergeableBorders) {
	for(var b=0, len=mergeableBorders.length; b<len; ++b) {
		var border = mergeableBorders[b]
		var err = computeMergeError(border)
	}
	while(mergeableBorders.length>0) {
		mergeableBorders.sort(mergeableBordersSorter)
		var border = mergeableBorders[0]
		if(border.mergeError > maxErr) break
//console.log(mergeableBorders.length, border.walls.length)
		mergeBorder(mergeableBorders, 0)
		var wall = border.walls[0]
		var end1 = wall.end1, end2 = wall.end2
		if(end1.walls.length===2)
			computeMergeError(end1)
		if(end2.walls.length===2)
			computeMergeError(end2)
	}
	doRemoveWalls(walls)
	recomputeWallsAngle(walls)
}

var mergeableBordersSorter = function(b1, b2) {
	return b1.mergeError - b2.mergeError
}

var computeMergeError = function(border) {
	var err=0
	// determine walls order
	var walls=border.walls, wall1=walls[0], wall2=walls[1]
	var end1 = (border===wall1.end1) ? wall1.end2 : wall1.end1
	var end2 = (border===wall2.end1) ? wall2.end2 : wall2.end1
	// pre compute
	var x1 = end1.x, y1 = end1.y
	var x2 = end2.x, y2 = end2.y
	var xy = x2*y1 - y2*x1
	var dx = x2-x1, dy = y2-y1
	var dxy2 = dx*dx + dy*dy
	// sum border errors
	err += _computeMergeError(border, dx, dy, xy, dxy2)
	var inners1 = wall1.inners, inners2 = wall2.inners
	for(var b=0, len=inners1.length; b<len; ++b) {
		err += _computeMergeError(inners1[b], dx, dy, xy, dxy2)
	}
	for(var b=0, len=inners2.length; b<len; ++b) {
		err += _computeMergeError(inners2[b], dx, dy, xy, dxy2)
	}
	border.mergeError = err
	return err
}

var _computeMergeError = function(border, dx, dy, xy, dxy2) {
	var x = border.x, y = border.y
	var err = abs(dy*x - dx*y + xy) / sqrt(dxy2)
	return err
}

Wall.compAng = function(){
	var end1=this.end1, end2=this.end2
	var a = atan2(end1.x-end2.x, end2.y-end1.y) + PI_2
	a = a % (this.both ? PI : PI_2)
	this.a = a
}

var recomputeWallsAngle = function(walls) {
	for(var i=0, len=walls.length; i<len; ++i)
		walls[i].compAng()
}

var reorderWalls = function(walls) {
	// move walls
	var remWalls = walls.slice()
	walls.length = 0
	// loop as long as there are remaining walls
	var first=true
	while(remWalls.length>0){
		var found=false
		if(!first){
			for(var i=0, len=remWalls.length; i<len; ++i){
				var rwall=remWalls[i]
				// try appending rwall to last wall
				var rend1=rwall.end1
				if(rend1.x===x2 && rend1.y===y2){
					remWalls.splice(i, 1)
					var end2=rwall.end2, x2=end2.x, y2=end2.y
					walls.push(rwall)
					found=true
					break
				}
				// try appending rwall to first wall
				var rend2=rwall.end2
				if(rend2.x===x1 && rend2.y===y1){
					remWalls.splice(i, 1)
					var end1=rwall.end1, x1=end1.x, y1=end1.y
					walls.splice(firstWallIdx, 0, rwall)
					found=true
					break
				}
			}
		}
		first=false
		if(!found){
			// else, add first rem wall as new block
			var rwall=remWalls.shift(),
				end1=rwall.end1, x1=end1.x, y1=end1.y,
				end2=rwall.end2, x2=end2.x, y2=end2.y
			walls.push(rwall)
			var firstWallIdx=walls.length-1
		}
	}
}

// various

var floor = Math.floor,
	abs = Math.abs,
	sqrt = Math.sqrt,
	atan2 = Math.atan2

var replaceInArr = function(arr, obj1, obj2) {
	var i = arr.indexOf(obj1)
	if(i!==-1) arr[i] = obj2
}

}())