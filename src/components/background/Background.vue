<template>
  <div ref="threeContainer" />
</template>

<script>
import * as THREE from 'three';

export default {
  data: () => {

  },
  mounted() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    const geometry = new THREE.PlaneGeometry(5, 5, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);

    scene.add(plane);

    this.$refs.threeContainer.appendChild(renderer.domElement);

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    animate();
  },
  beforeDestroy() {
    // Remove event listeners if any
    window.removeEventListener('resize', this.handleResize);

    // Dispose of material and geometry
    plane.material.dispose();
    plane.geometry.dispose();

    // Dispose of scene and camera
    scene.dispose();

    // Stop animation loop if you have one
    cancelAnimationFrame(this.animationFrameId);
  }
}
</script>