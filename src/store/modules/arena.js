export default {
  namespaced: true,
  state: {
    entities: null,
    entityRegistry: [],
    playerActive: true,
    plannedPath: [],
    map: null,
    active: { x: 7, y: 7 },
    overlayRegistry: {
      validDestination: [],
      targeting: [],
    },
    shapeOnMouse: {
      show: false,
      shape: 'diamond', // string for highlightShape
      radius: 3,
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
    registerEntity(state, args) {
      state.entityRegistry.push({
        x: args.x,
        y: args.y,
      });
    },
    entityMouseOver(state, args) {
      state.entities[args.x][args.y][0].hover = true;
    },
    entityMouseOut(state, args) {
      state.entities[args.x][args.y][0].hover = false;
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
    moveEntity() {

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
