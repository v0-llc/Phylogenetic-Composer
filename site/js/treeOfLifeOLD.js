var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100);

var raycaster = new THREE.Raycaster();
var mouseVec = new THREE.Vector2();

// Full intensity white light.
var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Turn on antialiasing
var renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
// White background
//renderer.setClearColor(0xeeeeee);
renderer.setClearColor(0x001122);

// Add this scene to the glContainer element
document.getElementById("glContainer").appendChild(renderer.domElement);

/******** SHAPES ********/
// An array of all nodes
var nodes = [];
var colliders = [];
var levelList = [];
var intersectedNodes;
var levelCounts = [];

var colliderMat = new THREE.MeshBasicMaterial({
    color: 0xffffff
});
colliderMat.visible = false;
var colliderGeom = new THREE.BoxGeometry(1, 1, 1);

var nodeMat = new THREE.MeshBasicMaterial({
    //color: 0x22aa55
    //color: 0x003344
    color: 0xeeeeee
});
nodeMat.transparent = true;
nodeMat.opacity = 0.9;

nodeMat.shading = THREE.FlatShading;


camera.position.z = 10;
camera.position.y = 5;

var randAmp = 0.21;

/**************** NODE CLASS ****************/

var Node = function () {

    this.name;
    this.level;

    this.parentNode;
    var numChildren = Math.floor((Math.random() * 4) + 1);
    var circleRadius = 0.1 * (numChildren / 2);
    this.nodeGeom = new THREE.CircleGeometry(circleRadius, 32);
    this.innerGeom = new THREE.CircleGeometry(circleRadius * 0.85, 32);
    this.childNodes = [];
    this.childID;
    this.arrangeID;

    this.hovered = false;
    var hoverCounter = 0.0;
    this.activated = false;

    var noiseCounter = 0.0;

    this.growing = true;
    this.adjusting = false;
    var growCounter = 0.0;
    this.adjustCounter = 0.0;

    this.mesh = new THREE.Mesh(this.nodeGeom, nodeMat);


    // Add to array of meshes for raycasting.    
    this.nodeHighlightMat = new THREE.MeshBasicMaterial({
        color: 0x001122
    });
    //this.nodeHighlightMat.visible = false;

    this.innerMesh = new THREE.Mesh(this.innerGeom, this.nodeHighlightMat);

    this.lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff
    });
    this.lineMat.transparent = true;
    this.lineMat.opacity = 0.0;


    this.curve = new THREE.CubicBezierCurve3(new THREE.Vector3, new THREE.Vector3, new THREE.Vector3, new THREE.Vector3);
    this.curveGeom = new THREE.Geometry;
    var maxCurve = new THREE.Geometry;
    //this.curveObj = new THREE.Line(this.curveGeom, this.lineMat);

    this.colliderObj = new THREE.Mesh(colliderGeom, colliderMat);
    colliders.push(this.colliderObj);

    this.lastOrigin = new THREE.Vector3();
    this.currentOrigin = new THREE.Vector3();
    this.actualPos = new THREE.Vector3;

    this.randSpeed = Math.random() / 3;

    this.offset1 = Math.random();
    this.offset2 = Math.random();
    this.offset3 = Math.random();
    this.offset4 = Math.random();

    /******** Node Methods ********/

    this.createChildren = function () {
        this.activated = true;
        for (var i = 0; i < numChildren; i++) {
            createNode(this.level + 1, i, this);
        }
        recalculateOrigins();
    };

    this.update = function () {
        noiseCounter += 0.01;

        this.colliderObj.position.copy(this.currentOrigin);

        if (this.currentOrigin != this.lastOrigin) {
            this.adjustCounter += 0.01;
            this.actualPos = this.lastOrigin.lerp(this.currentOrigin, this.adjustCounter);
        }

        if (this.level != 0) {

            // Creating the curve...            
            this.curve.v0.copy(this.parentNode.mesh.position);
            this.curve.v0.z = 0.01;
            this.curve.v3.copy(this.mesh.position);
            this.curve.v3.z = 0.01;

            this.parentCopy = new THREE.Vector3().copy(this.parentNode.mesh.position);
            this.meshCopy = new THREE.Vector3().copy(this.mesh.position);

            this.tempV1 = this.parentCopy.lerp(this.meshCopy, .1);
            this.tempV1.y += 0.5;

            this.parentCopy = new THREE.Vector3().copy(this.parentNode.mesh.position);
            this.meshCopy = new THREE.Vector3().copy(this.mesh.position);

            this.tempV2 = this.parentCopy.lerp(this.meshCopy, .9);
            this.tempV2.y -= 0.5;

            this.curve.v1.copy(this.tempV1);
            this.curve.v1.z = 0.01;
            this.curve.v2.copy(this.tempV2);
            this.curve.v2.z = 0.01;


            maxCurve.vertices = this.curve.getPoints(50);

            if (this.growing) {
                growCounter += 0.03;
                this.mesh.scale.set(growCounter, growCounter, growCounter);
                this.innerMesh.scale.set(growCounter, growCounter, growCounter);
                this.lineMat.opacity = growCounter * 0.5;

                var tempCurve = new THREE.Geometry;
                tempCurve.vertices = maxCurve.vertices.slice(0, Math.floor(50 * growCounter) - 1);

                if (this.curveObj != null) {
                    scene.remove(this.curveObj);
                }

                this.curveObj = new THREE.Line(tempCurve, this.lineMat);

                scene.add(this.curveObj);
            }




            if (growCounter >= 1.0) {
                growCounter = 0.0;
                this.growing = false;
                scene.remove(this.curveObj);
                this.curveObj = new THREE.Line(maxCurve, this.lineMat);
                scene.add(this.curveObj);
            }
            if (this.adjustCounter >= 1.0) {

                this.adjustCounter = 0.0;
                this.lastOrigin = this.currentOrigin;
            }
            this.curveObj.geometry.verticesNeedUpdate = true;

        }

        this.mesh.position.set(this.actualPos.x, this.actualPos.y, this.actualPos.z);


        this.mesh.position.x += noise.simplex2(noiseCounter * this.randSpeed + this.offset1, noiseCounter * this.randSpeed + this.offset2) * randAmp;
        this.mesh.position.y += noise.simplex2(noiseCounter * this.randSpeed + this.offset3, noiseCounter * this.randSpeed + this.offset4) * randAmp;

        this.innerMesh.position.set(this.mesh.position.x, this.mesh.position.y /*+circleRadius/4*/ , this.mesh.position.z + 0.001);



        if ((this.hovered || this.activated) && hoverCounter < 1.0) {
            //this.nodeHighlightMat.visible = true;
            hoverCounter += 0.05;
        } else if (hoverCounter >= 0.0 && !this.activated && !this.hovered) {
            hoverCounter -= 0.05;
        }
        if (hoverCounter < 0) {
            hoverCounter = 0.0;
        }

        this.innerMesh.scale.set(hoverCounter + 0.01, hoverCounter + 0.01, 1);
    };
};

createNode(0, 0, null);

// Looping function to display shapes.
function render() {

    requestAnimationFrame(render);
    raycaster.setFromCamera(mouseVec, camera);
    intersectedNodes = raycaster.intersectObjects(colliders);

    for (var i = 0; i < nodes.length; i++) {
        nodes[i].hovered = false;
    }

    if (intersectedNodes.length > 0) {
        //if (intersectedNodes[0].object.name != "") {
        var nodeNum = intersectedNodes[0].object.name;
        nodes[nodeNum].hovered = true;
        //document.getElementById("descriptHeading").innerHTML = nodes[intersectedNodes[0].object.name].name;
        //}
    }

    // Look through all of the nodes...
    for (var i = 0; i < nodes.length; i++) {

        nodes[i].update();
    }

    renderer.render(scene, camera);
}

function recalculateOrigins() {

    levelList = [];

    for (var i = 0; i < nodes.length; i++) {

        if (levelList[nodes[i].level] == null) {
            levelList[nodes[i].level] = [];
        }
        levelList[nodes[i].level].push(nodes[i]);

    }

    for (var i = 0; i < levelList.length; i++) {
        levelList[i].sort(
            function (a, b) {
                if (a.arrangeID > b.arrangeID) {
                    return 1;
                }
                if (a.arrangeID < b.arrangeID) {
                    return -1;
                }
                return 0;
            }
        );
    }

    for (var i = 0; i < levelList.length; i++) {
        for (var j = 0; j < levelList[i].length; j++) {
            var currentNode = (levelList[i])[j];

            if (!currentNode.growing) {
                currentNode.lastOrigin = currentNode.actualPos;
            }
            currentNode.currentOrigin = new THREE.Vector3(-1 * ((levelList[i].length - 1) / 2) + j, currentNode.level, 0);
            currentNode.adjustCounter = 0.0;
        }
    }
}

/**************** INPUT ****************/
function onMouseMove(event) {
    event.preventDefault();
    mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick(event) {
    event.preventDefault();
    if (intersectedNodes.length > 0) {
        var selectedNode = nodes[intersectedNodes[0].object.name];

        if (!selectedNode.activated) {
            selectedNode.createChildren();
        }
    }
}

document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('mousedown', onMouseClick, false);

/**************** FUNCTIONS ****************/


// This will need to be retooled...
function createNode(nodeLevel, childID, parent) {
    // Add the node to the array...

    var newNode = new Node();

    nodes.push(newNode);
    if (levelCounts[nodeLevel] == null) {
        levelCounts.push(0);
    }
    levelCounts[nodeLevel] ++;

    // Give it a unique name...
    newNode.name = "node" + (nodes.length - 1);
    newNode.level = nodeLevel;
    newNode.childID = childID;
    newNode.colliderObj.name = nodes.length - 1;

    if (nodeLevel != 0) {
        newNode.parentNode = parent;

        newNode.parentNode.childNodes.push(newNode);

        newNode.lastOrigin = new THREE.Vector3(newNode.parentNode.currentOrigin.x, newNode.parentNode.currentOrigin.y, newNode.currentOrigin.z);
        newNode.currentOrigin = newNode.lastOrigin;

        newNode.arrangeID = newNode.parentNode.arrangeID + newNode.childID;


    } else {
        newNode.arrangeID = "0";
    }

    // Add it to the scene   
    scene.add(newNode.mesh);
    scene.add(newNode.innerMesh);

    scene.add(newNode.colliderObj);
}

render();