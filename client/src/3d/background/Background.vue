<template>
  <div class="game-background"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import { markRaw } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Noise } from 'noisejs';

let scene;
let camera;
let renderer;
let plane;
let controls;
const planeSegments = 10;
let animationFrameId;

function initThreeJS(root) {
  renderer = markRaw(new THREE.WebGLRenderer());
  renderer.setSize(window.innerWidth, window.innerHeight);
  root.appendChild(renderer.domElement);

  scene = markRaw(new THREE.Scene());

  camera = markRaw(
    new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000),
  );
  camera.position.z = 50;
  controls = markRaw(new OrbitControls(camera, renderer.domElement));

  addLoginContent();

  window.addEventListener('resize', resize);
}

function addLoginContent() {
  const geometry = markRaw(new THREE.PlaneGeometry(50, 50, planeSegments, planeSegments));
  const noise = new Noise(Math.random());
  const positions = geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] * 0.05;
    const y = positions[i + 1] * 0.05;
    const n = noise.simplex2(x, y);
    positions[i + 2] = n * 2;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = markRaw(
    new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
  );

  plane = markRaw(new THREE.Mesh(geometry, material));
  scene.add(plane);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

onMounted(() => {
  initThreeJS(document.querySelector('.game-background'));
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  plane.material.dispose();
  plane.geometry.dispose();
  window.removeEventListener('resize', resize);
});
</script>

<style>
.game-background { width: 100%; height: 100%; position: absolute; }
</style>
