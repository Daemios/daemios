<template>
  <div
    ref="threeContainer"
    class="game-background"
  />
</template>

<script>
import { markRaw } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Noise } from 'noisejs';
// TODO remove all variables for the login scene and move that into a mixin
export default {
  data: () => ({
    scene: null,
    camera: null,
    renderer: null,
    plane: null,
    plane_segments: 10,
    animationFrameId: null,
  }),
  mounted() {
    this.initThreeJS();
    this.animate();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationFrameId);
    this.plane.material.dispose();
    this.plane.geometry.dispose();
  },
  methods: {
    initThreeJS() {
      // Initialize renderer
  this.renderer = markRaw(new THREE.WebGLRenderer());
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.$el.appendChild(this.renderer.domElement);

      // Initialize scene
  this.scene = markRaw(new THREE.Scene());

      // Initialize camera
  this.camera = markRaw(new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
  ));
      this.camera.position.z = 50;
  this.controls = markRaw(new OrbitControls(this.camera, this.renderer.domElement));

      // todo move this eventually when we have other scene content
    this.addLoginContent();

      // Keep canvas size in sync with window size
      window.addEventListener('resize', this.resize);
    },
    addLoginContent() {
      // Initialize plane
  const geometry = markRaw(new THREE.PlaneGeometry(50, 50, this.plane_segments, this.plane_segments));

      // Initialize noise
      const noise = new Noise(Math.random());

      // Get the positions attribute from geometry
      const positions = geometry.attributes.position.array;

      // Manipulate vertex positions using simplex noise
      // Scale coordinates to keep deformations subtle
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i] * 0.05;
        const y = positions[i + 1] * 0.05;
        const n = noise.simplex2(x, y);
        positions[i + 2] = n * 2;
      }

      // Update geometry after modifying vertices
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();

      // Create material
  const material = markRaw(new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true
  }));

      // Create mesh and add to scene
  this.plane = markRaw(new THREE.Mesh(geometry, material));
      //this.plane.rotation.x = -Math.PI / 6;  // Tilt by 30 degrees
      this.scene.add(this.plane);
    },
    animate() {
      requestAnimationFrame(this.animate.bind(this));

      // Update controls
      this.controls.update();

      this.renderer.render(this.scene, this.camera);
    },
    resize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  },
};
</script>

<style>
.game-background { width: 100%; height: 100%; position: absolute; }
</style>
