<template>
  <!--
  <v-dialog
    v-model="$store.state.dialogs.isMapOpen"
    width="unset"
    fullscreen
  >
    <v-card>
      <v-card-text
        class="overflow-hidden"
      >

        <v-row>
          <v-col>
            <v-text-field
              v-model="plane.size"
              label="Width"
            />
          </v-col>
          <v-col>
            <v-text-field
              label="Width"
            />
          </v-col>
          <v-col>
            <v-text-field
              label="Height"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
  -->
  <div ref="worldMap" />
</template>



<script>
const SimplexNoise = require('simplex-noise');
import * as Three from 'three';
import * as dat from 'dat.gui';
import {mapState} from "vuex";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

export default {
  data: () => ({
    gui: new dat.GUI(),
    scene: null,
    camera: null,
    renderer: null,
    light: null,
    controls: null,
    frames: 0,
    config: {
      // Noise
      scale: 217,
      octaves: 7, // how many instances of noise to add
      persistence: 2, // roughness
      lacunarity: 3.2, // how much noise
      exponentiation: 5.7, // how much flat area
      height: 20,

      segments: 200,
    },

    // Sun/moon lightsources
    orbit_light: {
      object: null,
      sun: null,
      moon: null,
    },

    // Future chunk handling
    chunks: null,

    // Plane specifics
    terrain: {
      noise: null,
      mesh: null,
      geometry: null,
      material: null,
    },
    water: {
      mesh: null,
      geometry: null,
      material: null,
    },
  }),
  computed: {
    ...mapState({
      world: (state) => state.world.terrain,
    })
  },
  watch: {
    world() {
      if (this.world.seed) {
        this.terrain.noise = new SimplexNoise(this.world.seed)
        this.setup()
        this.animate();
        console.log('mounted')
      }
    }
  },
  mounted() {
  },
  methods: {
    getNoise(x, y) {
      const xs = x / this.config.scale;
      const ys = y / this.config.scale;
      const G = 2.0**(-this.config.persistence);
      let amplitude = 1.0;
      let frequency = 1.0;
      let normalization = 0;
      let total = 0;
      for (let o = 0; o < this.config.octaves; o++) {
        const noiseValue = this.terrain.noise.noise2D(xs * frequency, ys * frequency) * 0.5 + 0.5;
        total += noiseValue * amplitude;
        normalization += amplitude;
        amplitude *= G;
        frequency *= this.config.lacunarity;
      }
      total /= normalization;
      return Math.pow(total, this.config.exponentiation) * (this.config.height * this.config.scale);
    },
    createBasics() {
      this.renderer = new Three.WebGLRenderer();
      this.renderer.setSize( window.innerWidth, window.innerHeight );
      this.renderer.setPixelRatio(devicePixelRatio)
      this.$refs.worldMap.appendChild( this.renderer.domElement );

      /**
       * Sizes
       */
      const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
      }

      // Scene
      this.scene = new Three.Scene()

      /**
       * Camera
       */
      // Base camera
      this.camera = new Three.PerspectiveCamera(75, sizes.width / sizes.height, 1, 200000)
      this.camera.position.x = 0
      this.camera.position.y = 9640*10
      this.camera.position.z = 0
      this.scene.add(this.camera)

      // Controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)

      window.addEventListener('resize', () =>
      {
        // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight

        // Update camera
        this.camera.aspect = sizes.width / sizes.height
        this.camera.updateProjectionMatrix()

        // Update renderer
        this.renderer.setSize(sizes.width, sizes.height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      })
    },
    createLights() {
      this.orbit_light.object = new Three.Object3D();

      this.orbit_light.sun = new Three.PointLight('#ffffff', 1.5)
      this.orbit_light.sun.position.x = this.world.length*-8
      this.orbit_light.sun.position.y = 0
      this.orbit_light.sun.position.z = 0
      this.orbit_light.object.add(this.orbit_light.sun)

      this.orbit_light.moon = new Three.PointLight('#5870c4', 1.5)
      this.orbit_light.moon.position.x = this.world.length*8
      this.orbit_light.moon.position.y = 0
      this.orbit_light.moon.position.z = 0
      this.orbit_light.object.add(this.orbit_light.moon)

      const sphereSize = 10;
      const pointLightHelper = new Three.PointLightHelper( this.orbit_light.sun, sphereSize );
      this.scene.add( pointLightHelper );


      this.scene.add(this.orbit_light.object);

      this.gui.add(this.orbit_light.object.rotation, 'y')
    },
    rebuildTerrain() {
      this.terrain.mesh.geometry.dispose()
      this.buildTerrain();
    },
    buildTerrain(offsetX, offsetY) {
      const {array} = this.terrain.geometry.attributes.position;
      console.log(offsetX, offsetY)
      for (let i = 0; i < array.length; i=i+3) {
        const x = i / 3 % this.config.segments;
        const y = Math.floor((i / 3) / this.config.segments);
        array[i+2] = this.getNoise(x + (offsetX * this.config.segments), y + (offsetY * this.config.segments))
      }
    },
    createChunk(offsetX = 0, offsetY = 0) {
      this.terrain.material = new Three.MeshStandardMaterial({
        wireframe: false,
        color: 0x666666,
        side: Three.DoubleSide,
        vertexColors: false,
        flatShading: Three.FlatShading,
      })
      const size = new Three.Vector3(
        this.config.segments * this.config.scale, this.config.segments * this.config.scale, 0);
      this.terrain.geometry = new Three.PlaneGeometry(size.x, size.y, this.config.segments-1, this.config.segments-1)
      this.buildTerrain(offsetX, offsetY);
      this.terrain.mesh = new Three.Mesh(this.terrain.geometry, this.terrain.material)
      this.terrain.mesh.translateX(this.config.segments * this.config.scale * offsetX)
      this.terrain.mesh.translateY(this.config.segments * this.config.scale * offsetY)
      //this.terrain.mesh.rotateX(-1.5708)
      this.scene.add(this.terrain.mesh)
    },
    createChunks() {

    },
    createMenus() {
      const terrainNoiseFolder = this.gui.addFolder('Terrain.Noise')
      terrainNoiseFolder.add(this.config, 'scale', 0, 300).onChange(this.rebuildTerrain)
      terrainNoiseFolder.add(this.config, 'octaves', 1, 20).onChange(this.rebuildTerrain)
      terrainNoiseFolder.add(this.config, 'persistence', .25, 5).onChange(this.rebuildTerrain)
      terrainNoiseFolder.add(this.config, 'lacunarity', .01, 5).onChange(this.rebuildTerrain)
      terrainNoiseFolder.add(this.config, 'exponentiation', .1, 10).onChange(this.rebuildTerrain)
      terrainNoiseFolder.add(this.config, 'height', 0, 500).onChange(this.rebuildTerrain)

      const terrainModelFolder = this.gui.addFolder('Terrain.Model')
      terrainModelFolder.add(this.config, 'segments', 0, 512).onChange(this.rebuildTerrain)
    },
    setup() {
      this.createBasics();
      this.createMenus();
      this.createChunk();
      this.createChunk(0, -1);
      this.createChunk(0, 1);

      let light = new Three.DirectionalLight(0x808080, 1, 100);
      light.position.set(-this.config.segments * this.config.scale, this.config.segments * this.config.scale, this.config.segments * this.config.scale);
      light.target.position.set(this.config.segments * this.config.scale, -(this.config.segments * this.config.scale), this.config.segments * this.config.scale);
      light.castShadow = false;
      this.scene.add(light);

      light = new Three.DirectionalLight(0x404040, 1.5, 100);
      light.position.set(-(this.config.segments * this.config.scale), -(this.config.segments * this.config.scale), this.config.segments * this.config.scale);
      light.target.position.set(0, 0, 0);
      light.castShadow = false;
      this.scene.add(light);

      //this.createLights()

    },
    animate() {
      requestAnimationFrame( this.animate );
      this.renderer.render( this.scene, this.camera );
    },
  }
}
</script>

