var scene,
  camera,
  controls,
  fieldOfView,
  aspectRatio,
  nearPlane,
  farPlane,
  shadowLight,
  backLight,
  light,
  renderer,
  container,
  raycaster;

//SCENE
var env, floor;

// CACHES
var treeCache = [];

// SETTINGS!!
var TREES = true;
var MOUNTAINS = true;
var CLOUDS = true;

//SCREEN VARIABLES
var HEIGHT,
  WIDTH,
  windowHalfX,
  windowHalfY,
  mousePos = {
    x: 0,
    y: 0
  };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function init() {

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xece9ca, 500, 2000);
  raycaster = new THREE.Raycaster();

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 60;
  nearPlane = 1;
  farPlane = 2000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane);
  camera.position.x = -500;
  camera.position.z = 500;
  camera.position.y = 300;
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMapEnabled = true;
  // renderer.shadowMapType = THREE.PCFSoftShadowMap;
  container = document.getElementById('world');
  container.appendChild(renderer.domElement);
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);
  //*
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minPolarAngle = -Math.PI / 2;
  controls.maxPolarAngle = Math.PI / 2 + .1;
  controls.noZoom = false;
  controls.noPan = true;
  //*/
}

function onWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  windowHalfX = WIDTH / 2;
  windowHalfY = HEIGHT / 2;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseUp(event) {

}

function handleTouchEnd(event) {

}

function createLights() {
  light = new THREE.HemisphereLight(0xffffff, 0xb3858c, .65);

  shadowLight = new THREE.DirectionalLight(0xffe79d, .7);
  shadowLight.position.set(80, 120, 50);
  shadowLight.castShadow = true;
  shadowLight.shadowDarkness = .3;
  shadowLight.shadowMapWidth = 2048;
  shadowLight.shadowMapHeight = 2048;

  backLight = new THREE.DirectionalLight(0xffffff, .4);
  backLight.position.set(200, 100, 100);
  backLight.shadowDarkness = .1;
  //backLight.castShadow = true;

  scene.add(backLight);
  scene.add(light);
  scene.add(shadowLight);
}

function makeCube(mat, w, h, d, posX, posY, posZ, rotX, rotY, rotZ) {
  var geom = new THREE.BoxGeometry(w, h, d);
  var mesh = new THREE.Mesh(geom, mat);
  mesh.position.x = posX;
  mesh.position.y = posY;
  mesh.position.z = posZ;
  mesh.rotation.x = rotX;
  mesh.rotation.y = rotY;
  mesh.rotation.z = rotZ;
  return mesh;
}

function createFloor() {

  if (env) {
    scene.remove(env);
    env = null;
  }
  env = new THREE.Group();

  var waterGeo = new THREE.BoxGeometry(1000, 1000, 100, 22, 22);
  for (var i = 0; i < waterGeo.vertices.length; i++) {
    var vertex = waterGeo.vertices[i];
    if (vertex.z > 0)
      vertex.z += Math.random() * 2 - 1;
    vertex.x += Math.random() * 5 - 2.5;
    vertex.y += Math.random() * 5 - 2.5;

    vertex.wave = Math.random() * 100;
  }

  waterGeo.computeFaceNormals();
  waterGeo.computeVertexNormals();

  floor = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({
    color: 0x6092c1,
    shading: THREE.FlatShading,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -105;
  floor.receiveShadow = true;
  floor.name = "Floor"
  env.floor = floor;

  env.add(floor);

  var islandGeo = new THREE.PlaneGeometry(700, 700, 60, 60);
  var zeroVector = new THREE.Vector3();

  var mods = [];
  var modVector;
  var modAmount = Math.floor(Math.random() * 6 + 1)

  for (var j = 0; j < modAmount; j++) {
    var modVector = new THREE.Vector3(Math.random() * 350, Math.random() * 350, 0);
    modVector.radius = Math.random() * 400;
    modVector.dir = Math.random() * 1 - .6 + modVector.radius / 5000;
    mods.push(modVector)
  }
  var midY = 0;
  for (var i = 0; i < islandGeo.vertices.length; i++) {
    var vertex = islandGeo.vertices[i];
    //if(vertex.distanceTo(zeroVector) < 300)
    // {

    vertex.z = -vertex.distanceTo(zeroVector) * .15 + 15 + Math.random() * 3 - 6;

    for (var j = 0; j < mods.length; j++) {
      var modVector = mods[j];

      if (vertex.distanceTo(modVector) < modVector.radius)
        vertex.z += vertex.distanceTo(modVector) / 2 * modVector.dir;

    }

    //}

    vertex.y += Math.random() * 20 - 10;
    vertex.x += Math.random() * 20 - 10;
    midY += vertex.z;

  }

  midY = midY / islandGeo.vertices.length;

  islandGeo.computeFaceNormals();
  islandGeo.computeVertexNormals();
  var island = new THREE.Mesh(islandGeo, new THREE.MeshLambertMaterial({
    color: 0x9bb345,
    shading: THREE.FlatShading,
    side: THREE.DoubleSide,
    wireframe: false
  }));
  island.rotation.x = -Math.PI / 2;
  island.position.y = -14;
  island.receiveShadow = true;
  island.castShadow = true;
  island.name = "island"
  env.island = island;
  env.add(island);

  scene.add(env);
}

Tree1 = function() {

  var height = 9 + Math.random() * 8;
  var boxGeom = new THREE.BoxGeometry(2, height, 1);
  this.root = new THREE.Mesh(boxGeom, this.yellowMat);
  this.root.position.y = 0;

  var sphereGeometry = new THREE.SphereGeometry(6, 8);

  for (var i = 0; i < sphereGeometry.vertices.length; i++) {
    var vertex = sphereGeometry.vertices[i];
    vertex.y += Math.random() * 3 - 1.5;
    vertex.x += Math.random() * 1 - .5;
    vertex.z += Math.random() * 1 - .5;
  }

  sphereGeometry.computeFaceNormals();
  sphereGeometry.computeVertexNormals();

  this.sphereGeometry = sphereGeometry;
  this.sphere = new THREE.Mesh(sphereGeometry, this.greenMat);
  this.sphere.position.y = height / 2 + 2;
  this.sphere.scale.y = .75 + Math.random() * .5;

}

var Forest = function(amount, pos, radius) {
  if (!treeCache || treeCache.length < 5) {
    for (var i = 0; i < 10; i++) {
      var t = new Tree1();
      treeCache.push(t);
    }
  }

  var yellowMat = new THREE.MeshLambertMaterial({
    color: 0xffde79,
    shading: THREE.FlatShading
  });

  var greenMat = new THREE.MeshLambertMaterial({
    color: 0xa6d247,
    shading: THREE.FlatShading
  });

  var roots = [];
  var crowns = [];
  var downVector = new THREE.Vector3(0, -1, 0);
  for (var i = 0; i < amount; i++) {
    //var c = new Tree1();
    var c = {
      position: new THREE.Vector3()
    };

    c.position.y = 100;
    var angle = Math.random() * 360;
    var r_radius = Math.random() * radius;
    c.position.x = pos.x + r_radius * Math.cos(angle)
    c.position.z = pos.z + r_radius * Math.sin(angle)
    scene.updateMatrixWorld();
    raycaster.set(c.position, downVector);
    var collisions = raycaster.intersectObject(env, true);

    if (collisions.length > 0) {
      if (collisions[0].object.name == "island") {
        var rnd = Math.floor(Math.random() * treeCache.length)
        c.root = treeCache[rnd].root.clone();
        c.sphere = treeCache[rnd].sphere.clone();

        c.root.position.y = c.sphere.position.y = collisions[0].point.y + 6;
        c.root.position.x = c.sphere.position.x = c.position.x;
        c.root.position.z = c.sphere.position.z = c.position.z;
        c.sphere.position.y += 4 + Math.random() * 4;

        console.log(collisions[0].object.name);
        roots.push(c.root);
        crowns.push(c.sphere);
      }
    } else {
      console.log("NOT FOUND")
    }

    //console.log(collisions)

  }

  roots = mergeMeshes(roots);
  crowns = mergeMeshes(crowns);

  this.threegroup = new THREE.Group();
  this.roots = new THREE.Mesh(roots, yellowMat);
  this.crowns = new THREE.Mesh(crowns, greenMat);
  this.threegroup.add(this.roots);
  this.threegroup.add(this.crowns);

  this.threegroup.traverse(function(object) {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

}

Cube = function() {

  this.yellowMat = new THREE.MeshLambertMaterial({
    color: 0xffde79,
    shading: THREE.FlatShading
  });
  this.whiteMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    shading: THREE.FlatShading,
    wireframe: true
  });

  this.threegroup = new THREE.Group();

  var boxGeom = new THREE.BoxGeometry(2, 4, 2);
  this.boxMesh = new THREE.Mesh(boxGeom, this.yellowMat);
  this.boxMesh.position.y = 0;
  this.threegroup.add(this.boxMesh);

  this.threegroup.traverse(function(object) {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

}

Cloud = function() {

  this.whiteMat = new THREE.MeshLambertMaterial({
    color: 0xfae2c8,
    shading: THREE.FlatShading,
    wireframe: false
  });

  var sphereGeom = new THREE.SphereGeometry(6 + Math.floor(Math.random() * 12), 8, 8);

  for (var i = 0; i < sphereGeom.vertices.length; i++) {
    var vertex = sphereGeom.vertices[i];
    vertex.y += Math.random() * 4 - 2;
    vertex.x += Math.random() * 3 - 1.5;
    vertex.z += Math.random() * 3 - 1.5;
  }

  sphereGeom.computeFaceNormals();
  sphereGeom.computeVertexNormals();

  this.threegroup = new THREE.Mesh(sphereGeom, this.whiteMat);
  this.threegroup.position.y = 60 + Math.random() * 150;
  this.threegroup.castShadow = true;

  this.threegroup.scale.x = 1.3 + Math.random() * 2;
  this.threegroup.scale.y = this.threegroup.scale.x / 2 + Math.random() * .5 - 0.25;
  this.threegroup.scale.z = 0.7 + Math.random() * 0.8;
  this.threegroup.rotation.y = Math.random() * 3;
  this.threegroup.position.x = Math.random() * 800 - 400;
  this.threegroup.position.z = Math.random() * 800 - 400;

  var rnd1 = Math.random() * 40 + 30 - (35);
  var rnd2 = Math.random() * 10 + 10 - 10;

  TweenMax.to(this.threegroup.position, 12 + Math.random() * 10, {
    repeat: -1,
    yoyo: true,
    x: this.threegroup.position.x + rnd1,
    ease: Sine.easeInOut
  });

  TweenMax.to(this.threegroup.position, 4 + Math.random() * 2, {
    repeat: -1,
    yoyo: true,
    overwrite:false,
    y: this.threegroup.position.y + rnd2,
    ease: Sine.easeInOut
  });


}

Mountain = function() {

  this.greyMat = new THREE.MeshLambertMaterial({
    color: 0xa99a9d,
    shading: THREE.FlatShading,
    wireframe: false,
    side: THREE.DoubleSide
  });

  this.threegroup = new THREE.Group();

  /* var boxGeom = new THREE.CylinderGeometry(20 + Math.random() * 50, 76 + Math.random() * 200, Math.random() * 400 + 50, 20, 20, false);
   */
  var zeroVector = new THREE.Vector3();
  var size = Math.random() * 200 + 100;
  var heightScale = Math.random() * .5 + 2;
  var boxGeom = new THREE.PlaneGeometry(size, size, 8 + Math.floor(Math.random() * 3), 8 + Math.floor(Math.random() * 3));

  for (var i = 0; i < boxGeom.vertices.length; i++) {

    var vertex = boxGeom.vertices[i];
    // vertex.x =0;
    vertex.z = (-vertex.distanceTo(zeroVector) * .5) * heightScale + 15 + Math.random() * 3 - 6;

    vertex.y += Math.random() * 10 - 5;
    vertex.x += Math.random() * 10 - 5;
    vertex.z += Math.random() * 20 - 10;

  }
  boxGeom.computeFaceNormals();
  boxGeom.computeVertexNormals();

  this.boxMesh = new THREE.Mesh(boxGeom, this.greyMat);
  var box = new THREE.Box3().setFromObject(this.boxMesh);
  console.log(box);
  this.boxMesh.position.y = Math.random() * 15 + 10;
  this.boxMesh.rotation.x = -Math.PI / 2;
  this.threegroup.add(this.boxMesh);

  this.threegroup.traverse(function(object) {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

}

tick = 0;

function loop() {
  render();
  tick++;

  // animate water
  if (env && env.floor) {
    for (var i = 0; i < env.floor.geometry.vertices.length; i++) {
      var vertex = env.floor.geometry.vertices[i];
      if (vertex.z > 0)
        vertex.z += Math.sin(tick * .015 + vertex.wave) * 0.04;

      //   vertex.x += Math.cos(tick*.01) * vertex.wave;
      //vertex.y += Math.sin(tick*.01) * vertex.wave;

    }
    env.floor.geometry.verticesNeedUpdate = true;
  }

  requestAnimationFrame(loop);
}

init();

//createFloor();
createLights();

//env.visible = false;

//createFloor();
var self = this;

setTimeout(build, 200);
//setInterval(build,2000);

function build() {

  TREES = document.getElementById("chkTrees").checked;

  MOUNTAINS = document.getElementById("chkMountains").checked;

  CLOUDS = document.getElementById("chkClouds").checked;

  /*if(scene.children.length > 0)
    {
      for( var i = scene.children.length - 1; i >= 0; i--) {
        if(!scene.children[i].intensity)
           scene.remove(scene.children[i])
      }
    }*/
  createFloor();
  if (MOUNTAINS) {

    var mountains = Math.floor(Math.random() * 5 - 2)

    for (var i = 0; i < mountains; i++) {
      var mountain1 = new Mountain();
      env.add(mountain1.threegroup);
      mountain1.threegroup.position.x = Math.random() * 700 - 350;
      mountain1.threegroup.position.z = Math.random() * 700 - 350;
    }
  }
  if (TREES) {

    var forest = new Forest(Math.random() * 20 + 10, new THREE.Vector3(0, 0, 0), 700);
    env.add(forest.threegroup);

    var extraForests = Math.floor(Math.random() * 15)
    for (var i = 0; i < extraForests; i++) {
      var forest = new Forest(Math.random() * 100, new THREE.Vector3(Math.random() * 500 - 250, 0, Math.random() * 500 - 250), Math.random() * 300);
      env.add(forest.threegroup);
    }

  }

  if (CLOUDS) {
    var clouds_num = 1 + Math.random() *5 ;
    for (var i = 0; i < clouds_num; i++) {
      var c = new Cloud();
      env.add(c.threegroup);
    }
  }

}
var cube = new Cube();
scene.add(cube.threegroup);
loop();

function render() {
  if (controls) controls.update();

  if (cube) {
    // cube.boxMesh.rotation.y+=.01;
  }
  renderer.render(scene, camera);
}

function mergeMeshes(meshes) {
  var combined = new THREE.Geometry();

  for (var i = 0; i < meshes.length; i++) {
    meshes[i].updateMatrix();
    combined.merge(meshes[i].geometry, meshes[i].matrix);
  }

  return combined;
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function rule3(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + (pc * dt);
  return tv;
}
