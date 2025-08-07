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
      heightNoise: new SimplexNoise('height'),
      moistureNoise: new SimplexNoise('moisture'),
      temperatureNoise: new SimplexNoise('temperature'),
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
      this.camera.position.set(0, 20, 20);
      this.camera.lookAt(0, 0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.$refs.sceneContainer.appendChild(this.renderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 20, 10);
      this.scene.add(ambient, dirLight);

      this.createHexGrid();
      this.animate = this.animate.bind(this);
      this.animate();
    },
    createHexGrid() {
      const hexRadius = 0.95;
      const geometry = new THREE.CylinderGeometry(hexRadius, hexRadius, 1, 6, 1, false);
      geometry.translate(0, 0.5, 0);
      const size = 10;
      const hexWidth = 1.5;
      const hexHeight = Math.sqrt(3);
      const maxHeight = 5;
      const tan = new THREE.Color('#d2b48c');
      const green = new THREE.Color('#22c55e');
      const shallow = new THREE.Color('#93c5fd');
      const deep = new THREE.Color('#2563eb');
      const sideMaterial = new THREE.MeshStandardMaterial({ color: '#888888' });
      const bottomMaterial = sideMaterial;

      for (let q = -size; q <= size; q += 1) {
        for (let r = -size; r <= size; r += 1) {
          const h = (this.heightNoise.noise2D(q * 0.1, r * 0.1) + 1) / 2;
          const m = (this.moistureNoise.noise2D(q * 0.1 + 100, r * 0.1 + 100) + 1) / 2;
          const t = (this.temperatureNoise.noise2D(q * 0.1 - 100, r * 0.1 - 100) + 1) / 2;

          let color = new THREE.Color();
          if (m < 0.7) {
            color = tan.clone().lerp(green, m / 0.7);
          } else {
            color = shallow.clone().lerp(deep, (m - 0.7) / 0.3);
          }

          const hsl = { h: 0, s: 0, l: 0 };
          color.getHSL(hsl);
          if (t < 0.5) {
            hsl.s = THREE.MathUtils.lerp(0, hsl.s, t / 0.5);
          } else {
            hsl.s = THREE.MathUtils.lerp(hsl.s, 1, (t - 0.5) / 0.5);
          }
          color.setHSL(hsl.h, hsl.s, hsl.l);

          const topMaterial = new THREE.MeshStandardMaterial({ color });
          const hex = new THREE.Mesh(geometry, [sideMaterial, topMaterial, bottomMaterial]);
          const x = hexWidth * (q + r / 2);
          const z = hexHeight * r;
          hex.position.set(x, 0, z);
          hex.scale.y = h * maxHeight + 0.1;
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
