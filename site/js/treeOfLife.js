// Parses the referenced Newick string.
var parser = new NewickParser();
parser.parseString();

/******** SCENE SETUP ********/
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 100);
camera.position.z = 10;
camera.position.y = 5;
//camera.rotation.x = 1;
//camera.rotation.y = 1;

var articleShown = false;
var articleString = "Mammalia";

var mouseClicked = false;
var timeoutVar;
var interactedWith = false;
var clickStart = new THREE.Vector2();
var clickDelta = new THREE.Vector2();

var currentZoomDest = camera.fov;

var raycaster = new THREE.Raycaster();
var mouseVec = new THREE.Vector2();
var mouseLast = new THREE.Vector2();
var mouseDelta = new THREE.Vector2();

// Full intensity white light.
var directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Turn on antialiasing
var renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

renderer.setClearColor(0x001122);

// Add this scene to the glContainer element
document.getElementById("glContainer").appendChild(renderer.domElement);

/******** NODES ********/
// An array of all nodes
var nodes = [];

/******** COLLIDERS ********/
// An array of all colliders (cubes around nodes)
var colliders = [];
// Holds the nodes which the mouse is hovering over.
var intersectedNodes;

var colliderMat = new THREE.MeshBasicMaterial({
    color: 0xffffff
});
colliderMat.transparent = true;
colliderMat.opacity = 0.1;
colliderMat.visible = false;
var colliderGeom = new THREE.BoxGeometry(1, 1, 1);

// Create the first node - the "root" of the tree
createNode(0, null);

/******** GLOBALS ********/
var randAmp = 0.21; // Controls the "amplitude" of perlin noise movement

/******** RENDER ********/
function render() {

    requestAnimationFrame(render);
    raycaster.setFromCamera(mouseVec, camera);
    intersectedNodes = raycaster.intersectObjects(colliders);

    for (var i = 0; i < nodes.length; i++) {
        nodes[i].hovered = false;
    }

    if (intersectedNodes.length > 0) {
        var nodeNum = intersectedNodes[0].object.name;
        nodes[nodeNum].hovered = true;
        document.getElementById("currentNode").innerHTML = nodes[intersectedNodes[0].object.name].newickNode.displayString;
    }else{
        document.getElementById("currentNode").innerHTML = "";
    }

    // Look through all of the nodes and update them.
    for (var i = nodes.length - 1; i >= 0; i--) {
        nodes[i].update();
    }

    if (camera.fov != currentZoomDest) {
        
        if(camera.fov > currentZoomDest){
            camera.fov -= 1.0;
        }
        if(camera.fov < currentZoomDest){
            camera.fov += 1.0;
        }
        
        if (camera.fov < 10) {
            camera.fov = 10;
        }
        if (camera.fov > 120) {
            camera.fov = 120;
        }
        camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

}

/**************** FUNCTIONS ****************/

function recalculateOrigins() {

    var levelList = [];

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

function createNode(childID, parent) {

    if (parent != null) {
        var newNode = new Node(parent.newickNode.childNodes[childID], childID);

        newNode.parentNode = parent;
        newNode.childID = childID;

        var currentParent = parent;
        while (currentParent != null) {
            currentParent.allChildren.push(newNode);
            currentParent = currentParent.parentNode;
        }

        newNode.parentNode.childNodes.push(newNode);

        newNode.lastOrigin = new THREE.Vector3(newNode.parentNode.currentOrigin.x, newNode.parentNode.currentOrigin.y, newNode.currentOrigin.z);
        newNode.currentOrigin = newNode.lastOrigin;

        newNode.arrangeID = newNode.parentNode.arrangeID + newNode.childID;
    } else {
        var newNode = new Node(parser.newickNodes[parser.newickNodes.length - 1]);

        newNode.arrangeID = "0";
    }
}

function removeChildren(parentNode) {
    parentNode.activated = false;
    parentNode.activeTimer = 0.0;

    for (var i = parentNode.allChildren.length - 1; i >= 0; i--) {
        parentNode.allChildren[i].deactivate();
    }
    parentNode.allChildren = [];
    recalculateOrigins();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**************** INPUT ****************/
function onMouseMove(event) {
    event.preventDefault();
    mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (mouseClicked) {
        clickDelta.x = mouseVec.x - clickStart.x;
        clickDelta.y = mouseVec.y - clickStart.y;

        //console.log(clickDelta.x + " " + clickDelta.y);       

        mouseDelta.x = mouseVec.x - mouseLast.x;
        mouseDelta.y = mouseVec.y - mouseLast.y;

        if(camera.position.x <= 20 && camera.position.x >= -20){
            camera.position.x -= mouseDelta.x * 8;
        }
        if(camera.position.y <= 20 && camera.position.y >= -20){
            camera.position.y -= mouseDelta.y * 8;
        }

        if(camera.position.x > 20) camera.position.x = 20;
        if(camera.position.x < -20) camera.position.x = -20;
        if(camera.position.y > 20) camera.position.y = 20;
        if(camera.position.y < -20) camera.position.y = -20;
        
        mouseLast.x = mouseVec.x;
        mouseLast.y = mouseVec.y;
    }
}

function onMouseClick(event) {

    mouseClicked = true;
    event.preventDefault();

    clickStart.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickStart.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouseLast.x = clickStart.x;
    mouseLast.y = clickStart.y;

    if (intersectedNodes.length > 0) {

        interactedWith = true;
        document.getElementById("title").classList.remove("topShown");
        document.getElementById("title").classList.add("topHidden");

        var selectedNode = nodes[intersectedNodes[0].object.name];

        if (selectedNode.activated) {
            timeoutVar = window.setTimeout(function () {
                removeChildren(selectedNode);
            }, 1500);
        }

        if (!selectedNode.activated && selectedNode.deactivatedTimer >= 120) {
            selectedNode.createChildren();
        }

        var articleName = nodes[intersectedNodes[0].object.name].newickNode.displayString;

        if (articleShown && !selectedNode.newickNode.combinedNode && articleName != articleString) {
            articleString = articleName;
            document.getElementById("articleContent").setAttribute("src", "http://en.m.wikipedia.org/wiki/" + articleName);
        }
    }
}

function toggleArticle() {
    interactedWith = true;
    document.getElementById("title").classList.remove("topShown");
    document.getElementById("title").classList.add("topHidden");
    articleShown = !articleShown;
    if (articleShown) {
        //document.getElementById("articleToggle").className = "arrow rightArrow";
        document.getElementById("article").className = "visible";
    } else {
        //document.getElementById("articleToggle").className = "arrow leftArrow";
        document.getElementById("article").className = "hidden";
    }
}

function showAbout(){
    document.getElementById("title").classList.remove("topHidden");
    document.getElementById("title").classList.add("topShown");
    document.getElementById("title").classList.remove("descriptHidden");
    document.getElementById("title").classList.add("descriptShown");
}
function hideAbout(){
    document.getElementById("title").classList.remove("descriptShown");
    document.getElementById("title").classList.add("descriptHidden");
}

function onMouseUp() {
    mouseClicked = false;
    window.clearTimeout(timeoutVar);
}

function onDocumentMouseWheel(event) {
    if (event.wheelDeltaY) {

        if ((event.wheelDeltaY > 0 && currentZoomDest > 10) || (event.wheelDeltaY < 0 && currentZoomDest < 120)) {
            currentZoomDest -= event.wheelDeltaY * 0.05;


        }
    }
}

document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('mousedown', onMouseClick, false);
document.addEventListener('mouseup', onMouseUp, false);
document.addEventListener('mousewheel', onDocumentMouseWheel, false);

window.addEventListener('resize', onWindowResize, false);

render();