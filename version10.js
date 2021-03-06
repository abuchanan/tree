/*
Ideas / Wants / TODOs

per-leaf size

have a fixed amount of energy which can be distributed
throughout the system on each iteration. This might have the effect of modulating
trunk/branch growth as the tree gets bigger.

ability to branch only from the sides, or at least have them trend towards the sides
  for second level branches, to mimic evergreen trees

ability for a node to have a randomly placed cluster of shapes (box, sphere, etc)
  instead of just a single one

per-node control over vertex/material colors

"upness", but in world coordinates

more advanced trend, e.g. non-linear

shape jitter

reconcile level controls: make consistent. some params are in parent, e.g. chance and upness.

add line geometry type for thin branches

add particle geometry type for leaves? or node type?

separate random number generators for every parameter

GUI:
- control x/y/z with one slider, or optionally each individually
- color range, or color choices
- separate UI for main controls: play, rotate, etc.
- use THREE.js orbit controls for rotation (at least) and maybe zoom/fit

****************************************************************************/

var saveEl = document.getElementById("saved");
var container = document.getElementById("container");

function Version10() {

  function trunkOpts(gui) {
    var opts = {
      thickness: 1,
      growth: 0.01,
      spacing: 5,
      trend: 0.0,
      jitterShape: 0,
      jitterDirection: 0.01,
      jitterFreq: 0,
      minJitterIndex: 3,
      geometry: "box",
    };

    gui.add(opts, "thickness", 0, 2).step(0.1).onChange(refresh);
    gui.add(opts, "growth", 0, 1).step(0.001).onChange(refresh);
    gui.add(opts, "spacing", 0, 50).step(1).onChange(refresh);
    gui.add(opts, "trend", -0.1, 0.1).step(0.01).onChange(refresh);
    gui.add(opts, "jitterShape", 0, 2).step(0.03).onChange(refresh);
    gui.add(opts, "jitterFreq", 0, 1).step(0.01).onChange(refresh);
    gui.add(opts, "jitterDirection", 0, 0.5).step(0.01).onChange(refresh);
    gui.add(opts, "minJitterIndex", 0, 50).step(1).onChange(refresh);
    gui.add(opts, "geometry", {
      "Box": "box",
      "Cylinder": "cylinder",
      "Sphere": "sphere",
    }).onChange(refresh);

    return opts;
  }

  function levelOpts(gui) {
    var opts = {
      jitterShape: 0,
      jitterDirection: 0.01,
      jitterFreq: 0.1,
      thickness: 1,

      growth: 0.01,
      spacing: 5,
      upness: 0.0,
      trend: 0.0,

      leafDistance: 5,
      numberOfLeaves: 5,

      minJitterIndex: 3,
      maxBranchDepth: 2,
      minBranchIndex: 10,
      minBranchAge: 1,
      maxBranchAge: 100,
      branchChance: 0,
      geometry: "box",
    };
    gui.add(opts, "branchChance", 0, 0.7).step(0.01).onChange(refresh);
    gui.add(opts, "thickness", 0, 2).step(0.01).onChange(refresh);
    gui.add(opts, "growth", 0, 1).step(0.001).onChange(refresh);
    gui.add(opts, "spacing", 0, 50).step(1).onChange(refresh);
    gui.add(opts, "upness", -Math.PI / 2, Math.PI / 2).step(0.01).onChange(refresh);
    gui.add(opts, "trend", -0.1, 0.1).step(0.01).onChange(refresh);
    gui.add(opts, "jitterShape", 0, 2).step(0.03).onChange(refresh);
    gui.add(opts, "jitterFreq", 0, 1).step(0.01).onChange(refresh);
    gui.add(opts, "jitterDirection", 0, 0.5).step(0.01).onChange(refresh);
    gui.add(opts, "minJitterIndex", 0, 50).step(1).onChange(refresh);
    gui.add(opts, "maxBranchDepth", 1, 20).step(1).onChange(refresh);
    gui.add(opts, "minBranchIndex", 1, 200).step(1).onChange(refresh);
    gui.add(opts, "maxBranchAge", 1, 20).step(1).onChange(refresh);
    gui.add(opts, "minBranchAge", 1, 50).step(1).onChange(refresh);
    gui.add(opts, "leafDistance", 1, 20).onChange(refresh);
    gui.add(opts, "numberOfLeaves", 0, 20).onChange(refresh);
    gui.add(opts, "geometry", {
      "Box": "box",
      "Cylinder": "cylinder",
      "Sphere": "sphere",
    }).onChange(refresh);
    return opts;
  }


  var materials = {
    basic: new THREE.MeshBasicMaterial(),
    phong: new THREE.MeshPhongMaterial(),
    lambert: new THREE.MeshLambertMaterial(),
    standard: new THREE.MeshStandardMaterial(),
    toon: new THREE.MeshToonMaterial(),
    physical: new THREE.MeshPhysicalMaterial(),
    depth: new THREE.MeshDepthMaterial(),
  }
  materials.lambert.color.setStyle("#6d451c");

  var geometries = {
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 15, 2, false),
    sphere: new THREE.SphereGeometry(1, 1, 1),
    box: new THREE.BoxGeometry(1,1,1,1,1,1),
  }

  var treeGroup = new THREE.Group();
  treeGroup.rotation.y = 2;
  setInterval(function() {
    if (opts.play) {
      treeGroup.rotation.y += 0.05;
    }
  }, 50);

  var root = new THREE.Group();
  root.add(treeGroup);

  var ctrl = {}
  var opts = {
    years: 90,
    lightIntensity: 2.1,
    seed: Math.floor(Math.random() * 1000),
    play: false,
    wireframe: false,
    levels: [],
  }

  if (saveEl.value != "") {
    opts = JSON.parse(atob(saveEl.value));
  }

  var rand = new Random(opts.seed);
  var showcase = Showcase(root, opts, container);
  var gui = new dat.GUI();

  gui.add(opts, "play").onChange(function() {
    showcase.play();
  });

  gui.add(treeGroup.rotation, "y", 0, Math.PI * 2).onChange(function() {
    showcase.render();
  });
  gui.add(opts, "lightIntensity", 0, 5).step(0.1).onChange(refresh);
  gui.add(opts, "years", 1, 100).onChange(refresh);
  gui.add(opts, "seed", 0, 1000).onFinishChange(refresh);

  opts.levels = [
    trunkOpts(gui.addFolder("Trunk")),
    levelOpts(gui.addFolder("First")),
    levelOpts(gui.addFolder("Second")),
    levelOpts(gui.addFolder("Third")),
  ];
  opts.levels[1].branchChance = 0.3;

  refresh();

var nodeCount = 0;

function refresh() {
  console.time("refresh")
  nodeCount = 0;
  rand = new Random(opts.seed);

  // Generation starts here.
  var trunk = [Node(0, opts.levels[0])];

  // Grow tree.
  // Time is measured in "years".
  console.timeStamp("grow")
  console.time("grow")
  for (var year = 0; year < opts.years; year++) {
    console.time("year " + year)
    GrowBranch(trunk, year, opts)
    console.timeEnd("year " + year)
  }
  console.timeEnd("grow")

  console.timeStamp("clear")
  // Clear group
  treeGroup.remove.apply(treeGroup, treeGroup.children);
  // Add new tree mesh
  treeGroup.add(trunk[0].bone);

  console.timeStamp("render")
  // Render
  showcase.render();
  showcase.fit();

  console.timeStamp("save")
  // Save settings
  saveEl.value = btoa(JSON.stringify(opts));

  console.log("node count", nodeCount);
  console.log("faces", nodeCount * 6);
  console.log("vertex", nodeCount * 6 * 6);

  console.timeEnd("refresh")
}
window.refresh = refresh;


function Node(depth, opts) {
  nodeCount++;

  var geo = geometries[opts["geometry"]].clone();
  var mat = materials.lambert;
  var m = new THREE.Mesh(geo, mat);
  var mesh = new THREE.Group();
  mesh.add(m);
  var bone = new THREE.Object3D();
  bone.add(mesh);

  mesh.scale.set(opts.thickness, 1, opts.thickness);
  mesh.rotation.y = randomBetween(-opts.jitterDirection, opts.jitterDirection);

  // Currently hard-coded to match parameters given to geometry constructors.
  bone.position.y = 1;//lopts.spacing;

  return {
    index: 0,
    depth: depth,
    age: 1,
    // Each node may have a list of branches starting at this node.
    branches: [],
    // Each node may have a list of leaves attached to this node.
    leaves: [],
    bone: bone,
    mesh: mesh,
  };
}


// This is the main controller of the model.
// A branch is an array of nodes.
function GrowBranch(branch, year, opts) {

  var root = branch[0];
  var lopts = opts.levels[root.depth];

  // Add a new node at the tip of the branch.
  var tipIndex = branch.length - 1;
  var tip = branch[tipIndex];
  var newNode = Node(tip.depth, lopts);
  branch.push(newNode);
  newNode.index = branch.length;
  tip.bone.add(newNode.bone);

  if (rand.nextFloat() < lopts.jitterFreq && newNode.index > lopts.minJitterIndex) {
    newNode.bone.rotation.x = randomBetween(-lopts.jitterDirection, lopts.jitterDirection);
    newNode.bone.rotation.z = randomBetween(-lopts.jitterDirection, lopts.jitterDirection);
  }

  // Trend up/downwards
  newNode.bone.rotation.z += lopts.trend;

  for (var i = 0; i < branch.length; i++) {
    GrowNode(branch[i], year, opts)
  }
}

function GrowNode(n, year, opts) {
  var lopts = opts.levels[n.depth];
  var bopts = opts.levels[n.depth + 1];
  n.age += 1;

  // Scale up the mesh over time, growing slowly with each year.
  //n.mesh.scale.multiplyScalar(1.0 + lopts.growth, 1, 1.0 + lopts.growth);
  n.mesh.scale.multiply(new THREE.Vector3(1.0 + lopts.growth, 1, 1.0 + lopts.growth));

  // Decide whether to create a new branch at this node.
  if (
    // Only if there are no existing branches.
    n.branches.length == 0
    // Only if not too deep in the tree.
    && n.depth < bopts.maxBranchDepth
    // Only if after a certain number of nodes in this branch
    && n.index > bopts.minBranchIndex
    // Only if this branch is greater than a given age.
    && n.age > bopts.minBranchAge
    // Only if this branch is less than a given age.
    && n.age < bopts.maxBranchAge
    // Random chance.
    && rand.nextFloat() < bopts.branchChance
  ) {

    var newNode = Node(n.depth + 1, bopts);
    newNode.bone.rotation.y = randomBetween(0, Math.PI * 2)
    newNode.bone.rotation.z = (Math.PI / 2) + randomBetween(bopts.upness - 0.2, bopts.upness + 0.2);

    n.branches.push([newNode]);
    n.bone.add(newNode.bone);
  }

  for (var j = 0; j < n.branches.length; j++) {
    GrowBranch(n.branches[j], year, opts)
  }
}




// Utilities
/****************************************************************************/


function jitterDirection(x, y, z) {
    return [
      (rand.nextFloat() - 0.5),
      0,
      (rand.nextFloat() - 0.5),
    ];
}

function jitterShape(shape, amt) {
  // TODO would be interesting to explore a method for jitter that is not
  //      per-point, such as superimposing jitter path over the shape,
  //      so that jitter is applied more smoothly.
  // TODO add ability to twist

  // TODO currently skipping first and last points to avoid breaking of seam
  for (var i = 1; i < shape.length - 1; i++) {
    shape[i].multiplyScalar(1 + (rand.nextFloat() * amt));
  }
}


function visitNodes(branch, f) {
  for (var i = 0; i < branch.length; i++) {
    f(branch[i]);
  }
  for (var i = 0; i < branch.length; i++) {
    for (var j = 0; j < branch[i].branches.length; j++) {
      visitNodes(branch[i].branches[j], f);
    }
  }
}


function createSkeletonMesh(count, opts, material) {
  var segmentHeight = 8;
  var segmentCount = count - 1;
  var height = segmentHeight * segmentCount;
  var halfHeight = height * 0.5;

  var sizing = {
    segmentHeight : segmentHeight,
    segmentCount : segmentCount,
    height : height,
    halfHeight : halfHeight
  };

  var geometry = new THREE.CylinderGeometry(
    0.2,                       // radiusTop
    opts.initialRadius,                       // radiusBottom
    sizing.height,           // height
    opts.shapeDivisions,                       // radiusSegments
    sizing.segmentCount, // heightSegments
    false                     // openEnded
  );

  for ( var i = 0; i < geometry.vertices.length; i ++ ) {
    var vertex = geometry.vertices[ i ];
    var y = ( vertex.y + sizing.halfHeight );

    var skinIndex = Math.floor( y / sizing.segmentHeight );
    var skinWeight = ( y % sizing.segmentHeight ) / sizing.segmentHeight;

    geometry.skinIndices.push( new THREE.Vector4( skinIndex, skinIndex + 1, 0, 0 ) );
    geometry.skinWeights.push( new THREE.Vector4( 1 - skinWeight, skinWeight, 0, 0 ) );
  }

  return new THREE.SkinnedMesh( geometry, material );
}


// End  module
}

/*
  if (opts.wireframe) {
    var wireframeMaterial = new THREE.MeshBasicMaterial({
      color: opts.wireframeColor,
    });
    wireframeMaterial.wireframe = true;
    var wireframe = new THREE.Mesh(geometries.branches, wireframeMaterial);
    group.add(wireframe);
  }


  if (opts.drawLeaves) {
    var leavesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      color: opts.leafColor,
      //vertexColors: THREE.VertexColors,
    });
    var leaves = new THREE.Points(geometries.leaves, leavesMaterial);
    group.add(leaves);
  }
  */



// Clean up if reloading saved page.
function cleanup() {
  var gui = document.querySelector(".dg")
  if (gui) {
    gui.remove();
  }
  container.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function() {
  cleanup();
  Version10();
});
