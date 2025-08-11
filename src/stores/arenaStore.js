import { defineStore } from 'pinia';
import { cartesian } from '@/mixins/cartesian';
import WorldGrid from '@/3d/world/WorldGrid';

export const useArenaStore = defineStore('arena', {
  state: () => ({
    debug: false,
    combat: false,
    playerActive: true,
    moving: false,
    showTurn: false,
    entities: null,
    terrain: null,
    overlays: [],
    entityRegistry: [],
    plannedPath: [],
    confirmedPath: [],
    activeRegister: { x: 7, y: 7, index: 0 },
    overlayRegistry: {
      validDestination: [],
      targeting: [],
      confirmedPath: [],
      hover: [],
    },
    shapeOnMouse: {
      show: false,
      shape: 'diamond',
      radius: 3,
    },
  }),
  actions: {
    setActive(args) {
      if (this.entities && this.entities[this.activeRegister.x] && this.entities[this.activeRegister.x][this.activeRegister.y]) {
        this.entities[this.activeRegister.x][this.activeRegister.y].active = false;
      }
      this.activeRegister = args;
      if (this.entities && this.entities[args.x] && this.entities[args.x][args.y]) {
        this.entities[args.x][args.y].active = true;
      }
      this.showTurn = true;
      setTimeout(() => { this.showTurn = false; }, 2000);
    },
    setTerrain(terrain) { this.terrain = terrain; },
    setEntities(entities) { this.entities = entities; },
    setCombat(combat) { this.combat = combat; },
    registerEntity(args) { this.entityRegistry.push({ x: args.x, y: args.y }); },
    clearEntityRegistry() { this.entityRegistry = []; },
    setPlannedPath(path) { this.plannedPath = path; },
    appendPlannedPath(cellPosition) { this.plannedPath.push(cellPosition); },
    clearPlannedPath() { this.plannedPath = []; },
    setConfirmedPath() {
      this.confirmedPath = this.plannedPath.slice();
      this.confirmedPath.forEach((coordinates) => {
        this.overlayRegistry.confirmedPath.push(coordinates);
        this.setOverlay({ ...coordinates, overlay: 'confirmedPath', boolean: true });
      });
    },
    moveEntity(teleport = false) {
      if (this.plannedPath.length > 0 && !this.moving) {
        this.clearOverlay('validDestination');
        this.setConfirmedPath();
        this.moving = true;
        if (teleport) {
          // teleport logic placeholder
        } else {
          this.moveByCell();
        }
      }
    },
    entityMouseOver(args) { if (this.entities?.[args.x]?.[args.y]) this.entities[args.x][args.y].hover = true; },
    entityMouseOut(args) { if (this.entities?.[args.x]?.[args.y]) this.entities[args.x][args.y].hover = false; },
    buildOverlays(arena) {
      cartesian.iterate(arena, (x, y) => {
        if (!(x in this.overlays)) this.overlays[x] = [];
        this.overlays[x][y] = [];
      });
    },
    setOverlay(args) {
      if (args.overlay) {
        this.overlayRegistry[args.overlay].push({ x: args.x, y: args.y });
        if (!this.overlays[args.x]) this.overlays[args.x] = [];
        if (!this.overlays[args.x][args.y]) this.overlays[args.x][args.y] = {};
        this.overlays[args.x][args.y][args.overlay] = args.boolean;
      } else {
        // eslint-disable-next-line no-console
        console.log('Tried to register overlay but overlay type was not provided');
      }
    },
    clearOverlay(overlay) {
      if (this.overlayRegistry[overlay]) {
        this.overlayRegistry[overlay].forEach((address) => {
          if (this.overlays[address.x]?.[address.y]) {
            this.overlays[address.x][address.y][overlay] = false;
          }
        });
      }
      this.overlayRegistry[overlay] = [];
    },
    clearOverlayAt(args) {
      if (this.overlayRegistry[args.overlay]) {
        if (this.overlays[args.x]?.[args.y]) this.overlays[args.x][args.y][args.overlay] = false;
      }
      const index = this.overlayRegistry[args.overlay].findIndex((entry) => entry.x === args.x && entry.y === args.y);
      if (index !== -1) this.overlayRegistry[args.overlay].splice(index, 1);
    },
    generateDummyArena(size = 15) {
      const world = new WorldGrid({ gridSize: size, seed: 1337 });
      const half = Math.floor(size / 2);
      const terrain = [];
      for (let x = 0; x < size; x += 1) {
        terrain[x] = [];
        for (let y = 0; y < size; y += 1) {
          const cell = world.getCell(x - half, y - half);
          terrain[x][y] = {
            terrain: {
              passable: cell.biome !== 'deepWater' && cell.biome !== 'shallowWater',
              moisture: cell.f,
              flora: cell.f,
              color: `#${cell.colorTop.getHexString()}`,
              height: cell.h,
            },
          };
        }
      }
      this.setTerrainData(terrain);
      const entities = [];
      const player = {
        name: 'Hero',
        faction: 'player',
        img: '/favicon.ico',
        active: true,
        hover: false,
        mp: { current: 10 },
        effects: [],
        log: [],
      };
      if (!entities[this.activeRegister.x]) entities[this.activeRegister.x] = [];
      entities[this.activeRegister.x][this.activeRegister.y] = player;
      const enemy = {
        name: 'Enemy',
        faction: 'enemy',
        img: '/favicon.ico',
        active: false,
        hover: false,
        mp: { current: 8 },
        effects: [],
        log: [],
      };
      if (!entities[5]) entities[5] = [];
      entities[5][5] = enemy;
      this.setEntities(entities);
      this.clearEntityRegistry();
      this.registerEntity({ x: this.activeRegister.x, y: this.activeRegister.y });
      this.registerEntity({ x: 5, y: 5 });
    },
    moveByCell() {
      if (this.confirmedPath.length > 0) {
        const { x, y } = this.confirmedPath[0];
        setTimeout(() => {
          const registryIndex = this.entityRegistry.findIndex((entry) => (
            entry.x === this.activeRegister.x && entry.y === this.activeRegister.y
          ));
          if (registryIndex !== -1) this.entityRegistry[registryIndex] = { x, y };
          if (this.entities) {
            if (!this.entities[x]) this.entities[x] = {};
            this.entities[x][y] = this.entities[this.activeRegister.x][this.activeRegister.y];
            this.entities[this.activeRegister.x][this.activeRegister.y] = null;
          }
          this.activeRegister = { x, y };
          this.confirmedPath.splice(0, 1);
          this.clearOverlayAt({ overlay: 'confirmedPath', x, y });
          this.moveByCell();
        }, 500);
      } else {
        this.moving = false;
      }
    },
    movement() {
      this.moveEntity();
    },
    setTerrainData(data) {
      this.buildOverlays(data);
      this.setTerrain(data);
    },
    async getTerrain() {
      if (!this.terrain) this.generateDummyArena();
    },
  },
});
