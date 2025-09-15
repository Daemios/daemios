import { defineStore } from 'pinia';

// Minimal arena store stub that does not depend on legacy 3d code.
// Preserves the public API used across the app but avoids heavy dependencies.
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
      // Toggle active flag on previous and new active positions if present
      try {
        if (this.entities && this.entities[this.activeRegister.x] && this.entities[this.activeRegister.x][this.activeRegister.y]) {
          this.entities[this.activeRegister.x][this.activeRegister.y].active = false;
        }
      } catch (e) { /* ignore */ }
      this.activeRegister = args;
      try {
        if (this.entities && this.entities[args.x] && this.entities[args.x][args.y]) {
          this.entities[args.x][args.y].active = true;
        }
      } catch (e) { /* ignore */ }
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
        if (this.overlayRegistry && Array.isArray(this.overlayRegistry.confirmedPath)) this.overlayRegistry.confirmedPath.push(coordinates);
        this.setOverlay({ ...coordinates, overlay: 'confirmedPath', boolean: true });
      });
    },
    moveEntity(teleport = false) {
      if (this.plannedPath.length > 0 && !this.moving) {
        this.clearOverlay('validDestination');
        this.setConfirmedPath();
        this.moving = true;
        if (teleport) {
          // teleport placeholder
        } else {
          this.moveByCell();
        }
      }
    },
    entityMouseOver(args) { if (this.entities?.[args.x]?.[args.y]) this.entities[args.x][args.y].hover = true; },
    entityMouseOut(args) { if (this.entities?.[args.x]?.[args.y]) this.entities[args.x][args.y].hover = false; },
    buildOverlays(arena) {
      // arena can be a 2D array or an object with width/height; handle common shapes
      let w = 0; let h = 0;
      if (Array.isArray(arena)) {
        w = arena.length;
        h = Array.isArray(arena[0]) ? arena[0].length : 0;
      } else if (arena && typeof arena.width === 'number' && typeof arena.height === 'number') {
        w = arena.width; h = arena.height;
      }
      if (w === 0 || h === 0) return;
      this.overlays = new Array(w);
      for (let x = 0; x < w; x += 1) {
        this.overlays[x] = new Array(h);
        for (let y = 0; y < h; y += 1) {
          this.overlays[x][y] = [];
        }
      }
    },
    setOverlay(args) {
      if (!args || !args.overlay) return;
      if (!this.overlayRegistry[args.overlay]) this.overlayRegistry[args.overlay] = [];
      this.overlayRegistry[args.overlay].push({ x: args.x, y: args.y });
      if (!this.overlays[args.x]) this.overlays[args.x] = [];
      if (!this.overlays[args.x][args.y]) this.overlays[args.x][args.y] = {};
      this.overlays[args.x][args.y][args.overlay] = args.boolean;
    },
    clearOverlay(overlay) {
      if (!this.overlayRegistry[overlay]) return;
      this.overlayRegistry[overlay].forEach((address) => {
        if (this.overlays[address.x]?.[address.y]) this.overlays[address.x][address.y][overlay] = false;
      });
      this.overlayRegistry[overlay] = [];
    },
    clearOverlayAt(args) {
      if (this.overlayRegistry[args.overlay]) {
        if (this.overlays[args.x]?.[args.y]) this.overlays[args.x][args.y][args.overlay] = false;
      }
      const index = this.overlayRegistry[args.overlay]?.findIndex((entry) => entry.x === args.x && entry.y === args.y) ?? -1;
      if (index !== -1) this.overlayRegistry[args.overlay].splice(index, 1);
    },
    generateDummyArena(size = 15) {
      // produce a simple flat terrain and a couple of placeholder entities
      const terrain = new Array(size);
      for (let x = 0; x < size; x += 1) {
        terrain[x] = new Array(size);
        for (let y = 0; y < size; y += 1) {
          terrain[x][y] = {
            terrain: {
              passable: true,
              moisture: 0,
              flora: 0,
              color: '#88aa88',
              height: 0,
            },
          };
        }
      }
      this.setTerrainData(terrain);
      const entities = [];
      const player = { name: 'Hero', faction: 'player', img: '/favicon.ico', active: true, hover: false, mp: { current: 10 }, effects: [], log: [] };
      if (!entities[this.activeRegister.x]) entities[this.activeRegister.x] = [];
      entities[this.activeRegister.x][this.activeRegister.y] = player;
      const enemy = { name: 'Enemy', faction: 'enemy', img: '/favicon.ico', active: false, hover: false, mp: { current: 8 }, effects: [], log: [] };
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
    movement() { this.moveEntity(); },
    setTerrainData(data) { this.buildOverlays(data); this.setTerrain(data); },
    async getTerrain() { if (!this.terrain) this.generateDummyArena(); },
  },
});
