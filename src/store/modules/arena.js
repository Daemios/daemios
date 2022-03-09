import Vue from 'vue';

export default {
  namespaced: true,
  state: {
    entities: null,
    entityRegistry: [],
    playerActive: true,
    plannedPath: [],
    map: null,
    activeRegister: { x: 7, y: 7 },
    overlayRegistry: {
      validDestination: [],
      validY: [],
      targeting: [],
    },
    shapeOnMouse: {
      show: false,
      shape: 'diamond', // string for highlightShape
      radius: 3,
    },
  },
  mutations: {
    setActive(state, args) {
      // Deactivate old active entity
      state.entities[state.activeRegister.x][args.activeRegister.y].active = false;

      // Activate and register new active entity
      state.activeRegister = args;
      state.entities[args.x][args.y].active = true;
    },
    setMap(state, map) {
      state.map = map;
    },
    setEntities(state, entities) {
      state.entities = entities;
    },
    registerEntity(state, args) {
      state.entityRegistry.push({
        x: args.x,
        y: args.y,
      });
    },
    entityMouseOver(state, args) {
      state.entities[args.x][args.y].hover = true;
    },
    entityMouseOut(state, args) {
      state.entities[args.x][args.y].hover = false;
    },
    clearEntityRegistry(state) {
      state.entityRegistry = [];
    },
    setPlannedPath(state, path) {
      state.plannedPath = path;
    },
    appendPlannedPath(state, cellPosition) {
      state.plannedPath.push(cellPosition);
    },
    clearPlannedPath(state) {
      state.plannedPath = [];
    },
    moveEntity(state) {
      if (state.plannedPath.length > 0) {
        const { x } = state.plannedPath[0];
        const { y } = state.plannedPath[0];
        setTimeout(() => {
          // Remove the OLD active entity from the entity registry and replace with new entry
          const index = state.entityRegistry.findIndex((entry) => (
            entry.x === state.activeRegister.x && entry.y === state.activeRegister.y
          ));
          Vue.set(state.entityRegistry, index, { x, y }); // preserves reactivity

          // Copy the active entity to a new position
          state.entities[x][y] = state.entities[state.activeRegister.x][state.activeRegister.y];

          state.entities[state.activeRegister.x][state.activeRegister.y] = null;
          state.activeRegister = { x, y };

          state.plannedPath.splice(0, 1);
        }, 500);
      }

      // this.commit('moveEntity', payload);
    },
    setOverlay(state, args) {
      if (args.overlay) {
        state.overlayRegistry[args.overlay].push({
          x: args.x,
          y: args.y,
        });
        state.map[args.x][args.y].overlays[args.overlay] = args.boolean;
      } else {
        console.log('Tried to register overlay but overlay type was not provided');
      }
    },
    clearOverlay(state, overlay) {
      // Iterate through coordinates and clear overlays
      if (state.overlayRegistry[overlay]) {
        state.overlayRegistry[overlay].forEach((address) => {
          state.map[address.x][address.y].overlays[overlay] = false;
        });
      }
      state.overlayRegistry[overlay] = [];
    },
  },
};
