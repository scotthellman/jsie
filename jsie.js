
var JSIE = function(){
	var positions = null;
	var index = 0;
	var rotation = 0;
	var mouse = false;
	var crop_angle = 0;
	var destination;
	var truth;
	var crop_buffer;
	var overlay_buffer;
	var rotate_buffer;

	var x_line = -1;
	var y_line = -1;

	function registerXYLines(x,y){
		x_line = x;
		y_line = y;
		return drawToDestination();
	}

	function clearXYLines(){
		x_line = -1;
		y_line = -1;
		return drawToDestination();
	}

    function registerCropCorners(x1,y1,x2,y2){
    	if(x2 < x1){
    		var temp = x1;
    		x1 = x2;
    		x2 = temp;
    	}
    	if(y2 < y1){
    		var temp = y1;
    		y1 = y2;
    		y2 = temp;
    	}
    	positions = [x1,y1,x2,y2];
    	return drawToDestination();
    }

    function clearCrop(){
    	positions = null;
    }

	function crop(){
		if(!positions) return;
		var rect = {left:positions[0],
		             top:positions[1],
		            width:positions[2] - positions[0],
		            height:positions[3]-positions[1]};
		crop_buffer.getContext('2d').drawImage(destination,0,0);
		crop_buffer = Pixastic.process(crop_buffer, "crop", {
			rect : rect
		});
		rotation = 0;
		clearCrop();
		return drawToDestination();
	}

	function rotate(angle){
		rotation = angle;
		return drawToDestination();
	}

	function doRotation(canvas){
		rotate_buffer.width = canvas.width;
		rotate_buffer.height = canvas.height;
		var context = rotate_buffer.getContext('2d');
		context.save();
		context.translate(canvas.width/2,canvas.height/2);
		context.rotate(rotation);
		context.drawImage(canvas,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height);
		context.restore();
		context = canvas.getContext('2d');
		context.clearRect(0,0,canvas.width,canvas.height);
		context.drawImage(rotate_buffer,0,0,canvas.width,canvas.height);
		// if(rotation % 90 != 0){
		// 	canvas = Pixastic.process(canvas, "crop", {
		// 		rect : {
		// 			left : (canvas.width - width)/2, 
		// 			top : (canvas.height-height)/2,
		// 		 	width : width,
		// 		 	height : height 
		// 		}
		// 	});
		// }	
		return canvas;
	}

	function init(canvas,base_img,max_height) {
		destination = canvas;
		truth = document.createElement('canvas');

		var target_width = base_img.width;
		var target_height = base_img.height;
		if(target_height > max_height){
			target_width *= max_height/target_height;
			target_height = max_height;
		}
		canvas.height = target_height;
		canvas.width = target_width;
		truth.width = target_width;
		truth.height = target_height;
		truth.getContext('2d').drawImage(base_img,0,0,target_width,target_height);

		crop_buffer = document.createElement('canvas');
		crop_buffer.width = truth.width;
		crop_buffer.height = truth.height;
		crop_buffer.getContext('2d').drawImage(truth,0,0);
		// $(document.body).append(crop_buffer);

		overlay_buffer = document.createElement('canvas');
		overlay_buffer.width = truth.width;
		overlay_buffer.height = truth.height;
		$(document.body).append(overlay_buffer);

		rotate_buffer = document.createElement('canvas');
		rotate_buffer.width = truth.width;
		rotate_buffer.height = truth.height;

		return drawToDestination();
	}

	function updateOverlay(){
		var context = overlay_buffer.getContext('2d');
		context.clearRect(0,0,overlay_buffer.width,overlay_buffer.height);
		if(positions){
			context.strokeRect(positions[0],positions[1],positions[2]-positions[0],positions[3]-positions[1]);
		}
		context.beginPath();
		context.strokeStyle = "rbga(0,0,0,0.5)";
		context.moveTo(x_line,0);
		context.lineTo(x_line,overlay_buffer.height);
		context.moveTo(0,y_line);
		context.lineTo(overlay_buffer.width,y_line);
		context.stroke();
	}

	function drawToDestination(){
		// destination.clearRect();
		destination.width = crop_buffer.width;
		destination.height = crop_buffer.height;
		destination.getContext('2d').drawImage(crop_buffer,0,0,crop_buffer.width,crop_buffer.height);
		destination = doRotation(destination);
		overlay_buffer.width = destination.width;
		overlay_buffer.height = destination.height;
		updateOverlay();
		destination.getContext('2d').drawImage(overlay_buffer,0,0);
		return destination;
	}

	//algo from http://stackoverflow.com/questions/9744255/instagram-lux-effect/9761841#9761841
	function autoAdjustColors(img,return_medians){
		var hist = getValueHistogram(img,return_medians);
		var lower = hist[Math.floor(hist.length * 0.05)]/255;
		var upper = hist[Math.floor(hist.length * 0.95)]/255;
		var contrast = (upper-lower);
		var intensity = -1 * contrast * lower;
		console.log(intensity + "," + contrast + ";" + lower + "," + upper);
		img = adjustValues(img,intensity,contrast);
		return img;
	}

	function adjustValues(img,intensity,contrast){
		var ctx = img.getContext('2d');
		var id = ctx.getImageData(0,0,img.width,img.height);
		var pixels = id.data;
		var length = pixels.length;
		var luminosities = [];
		for (var i = 0; i < length; i += 4) {
			var r = pixels[i] / 255;
			var g = pixels[i+1] / 255;
			var b = pixels[i+2] / 255;
			var v = Math.max(r,g,b);
			var min_val = Math.min(r,g,b);

			var c = v - min_val;
			var s = v == 0 ? 0 : c/v; 
			var h;
			if(v == r) h = (g - b)/c;
			else if(v == g) h = (b - r)/c;
			else if(v == b) h = (r - g)/c;
			while(h < 0){
				h += 2;
			}
			X = 1 - Math.abs((h%2) - 1);

			var delta_v = v * (1 - contrast) + intensity;
			var max_index = v == r ? 0 : v == g ? 1 : 2;
			var min_index = min_val == r ? 0 : min_val == g ? 1 : 2;
			var middlest = max_index != 0 && min_index != 0 ? 0 :
			max_index != 1 && min_index != 1 ? 1 :
			2;

			if(max_index == min_index){
				pixels[i] += 255*delta_v;
				pixels[i+1] += 255*delta_v;
				pixels[i+2] += 255*delta_v;
			}
			else{
				pixels[i+min_index] += 255 * delta_v * (1 - s);
				pixels[i+middlest] += 255 * delta_v;
				pixels[i+max_index] += delta_v * (s * (h - 1) + 1);
			}
		}	
		ctx.putImageData(id,0,0);
		return img;
	}

	function getValueHistogram(img,return_medians){
		var id = img.getContext('2d').getImageData(0,0,img.width,img.height);
		var pixels = id.data;
		var length = pixels.length;
		var luminosities = [];
		var rs = [];
		var gs = [];
		var bs = [];
		for (var i = 0; i < length; i += 4) {
			rs.push(pixels[i]);
			gs.push(pixels[i+1]);
			bs.push(pixels[i+2]);
			luminosities.push(Math.max(pixels[i],pixels[i+1],pixels[i+2]));
		}	
		if(return_medians){
			rs = rs.sort(function(a,b){return a-b;});
			gs = gs.sort(function(a,b){return a-b;});
			bs = bs.sort(function(a,b){return a-b;});
			return_medians[0] = rs[Math.floor(rs.length/2)];
			return_medians[1] = gs[Math.floor(gs.length/2)];
			return_medians[2] = bs[Math.floor(bs.length/2)];
		}
		return luminosities.sort(function(a,b){return a - b;});
	}

	return {
		init : init,
		crop : crop,
		rotate : rotate,
		registerXYLines : registerXYLines,
		clearXYLines : clearXYLines,
		registerCropCorners : registerCropCorners,
		clearCrop : clearCrop
	}
}();
