<template>
  <div
    ref="threeContainer"
    class="game-background"
  />
</template>

<script>
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Noise } from 'noisejs';

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
  beforeDestroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.plane.material.dispose();
    this.plane.geometry.dispose();
  },
  methods: {
    initThreeJS() {
      // Initialize renderer
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.$el.appendChild(this.renderer.domElement);

      // Initialize scene
      this.scene = new THREE.Scene();

      // Initialize camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.z = 50;
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // todo move this eventually when we have other scene content
      this.addLoginContent();
    },
    addLoginContent() {
      // Initialize plane
      const geometry = new THREE.PlaneGeometry(50, 50, this.plane_segments, this.plane_segments);

      // Initialize noise
      const noise = new Noise(Math.random());

      // Get the positions attribute from geometry
      const positions = geometry.attributes.position.array;

      // Create noise values that are half the size of the plane segments
      const noiseValues = [];
      for (let i = 0; i < this.plane_segments / 2; i++) {
        noiseValues.push(noise.simplex2(i, i));
      }

      // TODO do position manipulation here
      for (let i = 0; i < positions.length; i++) {

      }

      // Update geometry after modifying vertices
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();

      // Create material
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true
      });

      // Create mesh and add to scene
      this.plane = new THREE.Mesh(geometry, material);
      //this.plane.rotation.x = -Math.PI / 6;  // Tilt by 30 degrees
      this.scene.add(this.plane);
    },
    animate() {
      requestAnimationFrame(this.animate.bind(this));

      // Update controls
      this.controls.update();

      this.renderer.render(this.scene, this.camera);
    }
  },
};
</script>

<style lang="sass">
.game-background
  width: 100%
  height: 100%
  position: absolute
</style>
