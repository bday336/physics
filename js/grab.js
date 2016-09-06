
var debug = false;

var hands = [];
var colorArray = [];

// var gravity = -0.0001;

var vrModeGamePadButtonPressed = false; // because of annoying way gamepad buttons work
var squeezing = false;
var pressedController = -1;

function doGrab(){
	// HANDS!!!!
	for (j in controls.controllers) {
		if(debug) {
			console.time("controls");
		}


		var handControl = controls.controllers[j];
		if (!hands[j]) {
			//create a new hands[j] for each controller
			hands[j] = new THREE.Mesh(new THREE.OctahedronGeometry(.05), new THREE.MeshBasicMaterial({color: 0xEE0443, wireframe: true}));
			scene.add(hands[j]);
			colorArray[j] = new THREE.Color(1, 1/(2*(j+1)), 1/(2*j+1));
			hands[j].material.color.setRGB(colorArray[j].r, colorArray[j].g, colorArray[j].b);
		}
		if(handControl.pose){ //set hand vis at controller location
			hands[j].position.set(handControl.pose.position[0], handControl.pose.position[1], handControl.pose.position[2]);
			hands[j].quaternion.set(handControl.pose.orientation[0],handControl.pose.orientation[1],handControl.pose.orientation[2],handControl.pose.orientation[3]);
		}

		if (handControl.pose && handControl.buttons[3].pressed) { // enter VR mode
			pressedController = j;
			vrModeGamePadButtonPressed = true;
		} else if (vrModeGamePadButtonPressed && pressedController === j) {
			vrModeGamePadButtonPressed = false;
			pressedController = -1;
			vrMode = !vrMode;
			effect.setVRMode(vrMode);
		}

		//get vectors for things so that collision!
		if (handControl.pose){
			handPosVector.set(handControl.pose.position[0],handControl.pose.position[1],handControl.pose.position[2]);
		}
		for (var i = 0; i < grabbables.length; i++){
			if (grabbables[i]){
				relative[i] = new THREE.Vector3(everything.position.x + grabbables[i].position.x*everything.scale.x, everything.position.y + grabbables[i].position.y*everything.scale.y, everything.position.z + grabbables[i].position.z*everything.scale.z );
			}
		}

		//to change between edit and gallery mode:
		if (handControl.buttons[2].pressed){
			if (squeezing == false){
				editMode = !editMode;
				for (var i = 0; i< light.length; i++){
		    		lightSphere[i].visible = !lightSphere[i].visible;
		    	}
		    	if(editMode == true){
		    		for(var i = 0; i < point.length; i++){
							//create new text geometry and position for new info. I don't know why it doesn't work the second time.
						scene.remove(point[i].timeText);
						scene.remove(point[i].posText);

						point[i].timeText = new THREE.Mesh( 
							new THREE.TextGeometry(String(point[i].time).substring(13-datePrecision,13), {size: 0.03, height: 0.01}),
							new THREE.MeshNormalMaterial()
							);
						var tempPosText = "("+String(point[i].position.x).substring(0,positionPrecision)+", "+String(point[i].position.y).substring(0,positionPrecision)+", "+String(point[i].position.z).substring(0,positionPrecision)+")";
						point[i].posText = new THREE.Mesh( 
							new THREE.TextGeometry(tempPosText, {size: 0.03, height: 0.01}), 
							new THREE.MeshNormalMaterial()
							);
						point[i].timeText.position.set(point[i].position.x + 0.05, point[i].position.y, point[i].position.z);
						point[i].posText.position.set(point[i].position.x, point[i].position.y - 0.04, point[i].position.z);
						scene.add(point[i].posText);
						scene.add(point[i].timeText);

					}
				}
				squeezing = true;
			}
		} else {
			squeezing = false;
		}

		//collision for getting info from points
		for (var i = 0; i < point.length; i++){
			if (editMode&&(handPosVector.distanceTo(point[i].position) < pointCollision)){
				point[i].timeText.visible = true;
				point[i].posText.visible = true;
				point[i].material.color.setRGB(0,1,0);
				point[i].data.material.color.setRGB(0,1,0);
				point[i].data2.material.color.setRGB(0,1,0);
			} else {
				point[i].timeText.visible = false;
				point[i].posText.visible = false;
				point[i].material.color.setRGB(1,0,0);
				point[i].data.material.color.setRGB(1,1,0);
				point[i].data2.material.color.setRGB(0,1,1);
			}
		}

		//edit mode for grabbing and moving objects during scene setup:
		if (handControl.pose && handControl.buttons[1].pressed && editMode == true) { //grab stuff
			for (var i = 0; i < grabbables.length; i++){
				if (grabbables[i]&&(relative[i].distanceTo(handPosVector) < grabRadius[i])){
					grabbables[i].position.set((handControl.pose.position[0] - everything.position.x)/everything.scale.x, (handControl.pose.position[1] - everything.position.y)/everything.scale.y, (handControl.pose.position[2] - everything.position.z)/everything.scale.z);
					if(grabbables[i] != ramp){
						grabbables[i].quaternion.set(handControl.pose.orientation[0],handControl.pose.orientation[1],handControl.pose.orientation[2],handControl.pose.orientation[3]);
					} else{
						grabbables[i].position.y = 0;
					}
					// grabbables[i].scale.set(handControl.axes[0], handControl.axes[1], handControl.buttons[1].value);
					if (grabbables[i].intensity){
						var lightNumber = i;
						lightSphere[lightNumber].position.set(grabbables[i].position.x, grabbables[i].position.y, grabbables[i].position.z); //keep our light visualizer where the light is
						if (handControl.buttons[0].pressed){
							grabbables[i].intensity = handControl.axes[0] + 1;
						} else if (handControl.buttons[0].touched){
							grabbables[i].color.setHSL((1 + handControl.axes[0])/2, 1, (1 + handControl.axes[1])/2);
						}
						lightSphere[lightNumber].material.color.setRGB(grabbables[i].color.r * grabbables[i].intensity, grabbables[i].color.g * grabbables[i].intensity, grabbables[i].color.b * grabbables[i].intensity);
					}
					break;
				}
			}
		}



		if(debug) {
			console.timeEnd("controls");
			console.log(handControl.pose.position);
		}
	}
}

function experiment(){
			//experiment mode, tracking controller movement:
	if (editMode == false){
		for (j in controls.controllers) {//look at the controllers
			var handControl = controls.controllers[j];
			if (handControl.pose){
				point[currentPoint].position.set(handControl.pose.position[0], handControl.pose.position[1], handControl.pose.position[2]);	
				point[currentPoint].time = Date.now(); //milliseconds since 1970
				point[currentPoint].data.position.y = (point[currentPoint].position.y - everything.position.y)/2;
				var previousPoint = currentPoint - 1;
				if (previousPoint == -1){
					previousPoint = point.length - 1;
				}
				point[currentPoint].delta = point[currentPoint].position.distanceTo(point[previousPoint].position);
				point[currentPoint].data2.position.y = point[currentPoint].delta*2;
				var torusVertex = currentPoint + pointNumber + 1;
				torus.geometry.vertices[torusVertex].z = point[currentPoint].delta;
				if(currentPoint == 0){
					torus.geometry.vertices[pointNumber + pointNumber + 1].z = point[currentPoint].delta;
				}
				block[0].position.y = point[currentPoint].data.position.y;
				block[2].position.y = point[previousPoint].data.position.y;
				block[1].position.y = point[(currentPoint+(pointNumber-2))%pointNumber].data.position.y;
				stick.rotation.x = Math.PI*(point[(currentPoint+(pointNumber-2))%pointNumber].data.position.y - point[currentPoint].data.position.y);


				currentPoint = (currentPoint + 1)%pointNumber; //loop through the points, one per frame

			}



		}
	}
}