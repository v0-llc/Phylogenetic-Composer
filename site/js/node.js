/*
Contains the Node class which contains most of the visual behavior for individual elements on the tree.
*/

// The constructor requires an associated NewickNode, which contains the associated phylogenetic information.
var Node = function (newickNode) {
    this.newickNode = newickNode;
    this.audioNode = new AudioNode();
    // Effectively, the "distance" from the tree's origin
    this.level = this.newickNode.level;
    this.childID;
    this.arrangeID;

    /******** GEOMETRY ********/
    // Nodes are scaled according to their number of children
    var circleRadius = 0.1 * (this.newickNode.childNodes.length / 2) + 0.05;

    // Maximum circle radius.
    if (circleRadius > 0.6) {
        circleRadius = 0.6;
    }
    // Taxa are circles, while species are diamonds
    if (this.newickNode.childNodes.length > 0) {
        this.nodeGeom = new THREE.CircleGeometry(circleRadius, 32);
    } else {
        this.nodeGeom = new THREE.BoxGeometry(circleRadius * 3.0, circleRadius * 3.0, 0);
    }
    this.nodeMat = new THREE.MeshBasicMaterial({
        color: 0xeeeeee
    });
    this.nodeMat.transparent = true;
    this.nodeMat.opacity = 0.9;
    this.nodeMat.shading = THREE.FlatShading;
    
    this.mesh = new THREE.Mesh(this.nodeGeom, this.nodeMat);
    scene.add(this.mesh);

    // Taxa have inner circle colored as background. Species have orange center.
    if (this.newickNode.childNodes.length > 0) {
        this.nodeHighlightMat = new THREE.MeshBasicMaterial({
            color: 0x001122
        });
    } else {
        this.nodeHighlightMat = new THREE.MeshBasicMaterial({
            color: 0xcc5511
        });
    }

    // Inner highlight
    this.innerGeom = new THREE.CircleGeometry(circleRadius * 0.85, 32);
    this.innerMesh = new THREE.Mesh(this.innerGeom, this.nodeHighlightMat);
    scene.add(this.innerMesh);

    this.colliderObj = new THREE.Mesh(colliderGeom, colliderMat);
    scene.add(this.colliderObj);
    colliders.push(this.colliderObj);

    /**** LINES ****/
    this.lineMat = new THREE.LineBasicMaterial({
        color: 0xffffff
    });
    this.lineMat.transparent = true;
    this.lineMat.opacity = 0.0;

    this.curve = new THREE.CubicBezierCurve3(new THREE.Vector3, new THREE.Vector3, new THREE.Vector3, new THREE.Vector3);
    this.curveGeom = new THREE.Geometry;
    var maxCurve = new THREE.Geometry;

    /******** CHILDREN ********/
    this.childNodes = [];
    this.allChildren = [];

    /******** STATUS ********/
    this.hovered = false;
    var hoverCounter = 0.0;

    this.activated = false;
    this.activeTimer = 0.0;
    this.deactivatedTimer = 120.0;

    this.growing = true;
    var growCounter = 0.0;

    this.adjusting = false;
    this.adjustCounter = 0.0;

    var noiseCounter = 0.0;

    this.triggered = false;
    this.noteCounter = 0;
    this.noteDuration = Math.floor((Math.random()*4+1)) * 50;
    console.log(this.noteDuration);
    this.tempTrigCount = 0;

    /******** POSITION ********/
    this.lastOrigin = new THREE.Vector3();
    this.currentOrigin = new THREE.Vector3();
    this.actualPos = new THREE.Vector3;

    this.randSpeed = Math.random() / 3;

    this.offset1 = Math.random();
    this.offset2 = Math.random();
    this.offset3 = Math.random();
    this.offset4 = Math.random();

    nodes.push(this);

    /******** Node Methods ********/

    this.createChildren = function () {
        this.activated = true;
        this.deactivatedTimer = 0.0;
        for (var i = 0; i < this.newickNode.childNodes.length; i++) {
            createNode(i, this);
        }
        recalculateOrigins();
    };

    this.removeChildren = function () {
        this.activated = false;
        this.activeTimer = 0.0;

        for (var i = this.allChildren.length - 1; i >= 0; i--) {
            this.allChildren[i].deactivate();
        }
        this.allChildren = [];
        recalculateOrigins();
    };

    this.deactivate = function () {

        scene.remove(this.mesh);
        scene.remove(this.innerMesh);
        scene.remove(this.curveObj);
        scene.remove(this.colliderObj);

        var currentParent = this.parentNode;
        while (currentParent != null) {
            currentParent.allChildren.splice(currentParent.allChildren.indexOf(this), 1);
            currentParent = currentParent.parentNode;
        }
        colliders.splice(colliders.indexOf(this.colliderObj), 1);
        nodes.splice(nodes.indexOf(this), 1);

    };
    this.triggerChildren = function(){
        for(var i = 0; i < this.childNodes.length; i++){
            this.childNodes[i].triggered = true;
        }
    };
    this.update = function () {

        this.colliderObj.name = nodes.indexOf(this);

        if (this.activated && this.level==0) {
            this.activeTimer++;
            this.tempTrigCount++;
        } else {
            this.deactivatedTimer++;
        }
        if (!this.hovered) {
            noiseCounter += 0.01;
        }

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

        this.mesh.rotation.z = 45 * (Math.PI / 180);
        this.mesh.position.set(this.actualPos.x, this.actualPos.y, this.actualPos.z);

        this.mesh.position.x += noise.simplex2(noiseCounter * this.randSpeed + this.offset1, noiseCounter * this.randSpeed + this.offset2) * randAmp;
        this.mesh.position.y += noise.simplex2(noiseCounter * this.randSpeed + this.offset3, noiseCounter * this.randSpeed + this.offset4) * randAmp;

        this.innerMesh.position.set(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z + 0.001);

        /******** SELECTION SCALING ********/
        if (!this.activated) {
            if ((this.newickNode.childNodes.length == 0 || this.hovered) && hoverCounter < 1.0) {
                if (this.deactivatedTimer >= 120) {
                    hoverCounter += 0.05;
                }
            } else if (hoverCounter >= 0.0 && !this.hovered) {
                hoverCounter -= 0.05;
            }
        } else {
            if (this.newickNode.childNodes.length != 0 && this.hovered && hoverCounter >= 0.0) {

                if (this.activeTimer >= 120) {
                    hoverCounter -= 0.05;
                }

            } else if (hoverCounter < 1.0) {

                hoverCounter += 0.05;
            }
        }

        if (hoverCounter < 0) {
            hoverCounter = 0.0;
        }

        this.innerMesh.scale.set(hoverCounter + 0.01, hoverCounter + 0.01, 1);

        if(this.tempTrigCount > 200){
            this.triggered = true;
            this.tempTrigCount = 0;
        }
        
        if (this.triggered) {
            this.audioNode.vca.gain.value = 0.1;
            this.nodeMat.color.setHex(0xcc5511);
            this.noteCounter++;
        }else{
            this.nodeMat.color.setHex(0xeeeeee);
        }
        if(this.noteCounter > this.noteDuration){
            this.audioNode.vca.gain.value = 0.0;
            this.triggered = false;
            this.noteCounter = 0.0;
            this.triggerChildren();
        }
    };
};