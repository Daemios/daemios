<template>
  <div ref="sceneContainer" class="world-map"></div>
</template>

<script>
import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import api from '@/functions/api';

export default {
  name: 'WorldMap',
  data() {
    return {
      scene: null,
      camera: null,
      renderer: null,
      hexes: [],
      noise: new SimplexNoise(),
      raycaster: new THREE.Raycaster(),
      mouse: new THREE.Vector2(),
    };
  },
  mounted() {
    this.init();
    window.addEventListener('resize', this.onResize);
    this.$refs.sceneContainer.addEventListener('pointerdown', this.onPointerDown);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
    this.$refs.sceneContainer.removeEventListener('pointerdown', this.onPointerDown);
  },
  methods: {
    init() {
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;

      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      this.camera.position.set(0, 10, 10);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.$refs.sceneContainer.appendChild(this.renderer.domElement);

      this.createHexGrid();
      this.animate = this.animate.bind(this);
      this.animate();
    },
    createHexGrid() {
      const hexRadius = 0.95;
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        const x = Math.cos(angle) * hexRadius;
        const y = Math.sin(angle) * hexRadius;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }
      const geometry = new THREE.ShapeGeometry(hexShape);
      const size = 10;
      const hexWidth = 1.5;
      const hexHeight = Math.sqrt(3);

      for (let q = -size; q <= size; q += 1) {
        for (let r = -size; r <= size; r += 1) {
          const noiseVal = this.noise.noise2D(q * 0.1, r * 0.1);
          const color = new THREE.Color();
          if (noiseVal < -0.2) color.set('#3b82f6');
          else if (noiseVal < 0.2) color.set('#22c55e');
          else color.set('#a3a3a3');

          const material = new THREE.MeshBasicMaterial({ color });
          const hex = new THREE.Mesh(geometry, material);
          const x = hexWidth * (q + r / 2);
          const z = hexHeight * r;
          hex.position.set(x, 0, z);
          hex.userData = { q, r };
          this.scene.add(hex);
          this.hexes.push(hex);
        }
      }
    },
    animate() {
      requestAnimationFrame(this.animate);
      this.renderer.render(this.scene, this.camera);
    },
    onResize() {
      const width = this.$refs.sceneContainer.clientWidth;
      const height = this.$refs.sceneContainer.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    },
    onPointerDown(event) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.hexes);
      if (intersects.length > 0) {
        const hex = intersects[0].object;
        api.post('world/move', { q: hex.userData.q, r: hex.userData.r });
      }
    },
  },
};
</script>

<style scoped>
.world-map {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
