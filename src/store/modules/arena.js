export default {
  namespaced: true,
  state: {
    playerActive: true,
    activeEntityId: 0,
    plannedPath: [],
    map: null,
    entities: null,
    active: { x: 7, y: 7 },
    overlayRegistry: {
      validDestination: [],
      targeting: [],
    },
    entityRegistry: {},
    shapeOnMouse: {
      show: false,
      shape: null, // string for highlightShape
      radius: null,
    },
  },
  mutations: {
    setActive(state, active) {
      state.active = active;
    },
    setMap(state, map) {
      state.map = map;
    },
    setEntities(state, entities) {
      state.entities = entities;
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
