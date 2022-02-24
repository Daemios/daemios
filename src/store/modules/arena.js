export default {
  namespaced: true,
  state: {
    active: { x: 7, y: 7 },
    playerActive: true,
    activeEntityId: 0, // used only to deconflict when there are multiple entities in same square
    plannedPath: [],
    map: null,
    overlayRegistry: {
      validDestination: [],
      targeting: [],
    },
    shapeOnMouse: {
      shape: null, // string for highlightShape
      radius: null,
    },
    entities: null,
  },
  mutations: {
    setActive(state, active) {
      state.active = active;
    },
    setMap(state, map) {
      state.map = map;
    },
    setCell(state, args) {
      state.map[args.x][args.y].overlays[args.overlay] = args.boolean;
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
        console.log(args.overlay);
        console.log(state.overlayRegistry[args.overlay]);
        state.map[args.x][args.y].overlays[args.overlay] = args.boolean;
      } else {
        console.log('Tried to register overlay but overlay type was not provided');
      }
    },
    clearOverlay(state, args) {
      // Iterate through coordinates and clear overlays
      state.overlayRegistry[args.overlay].forEach((address) => {
        state.map[address.x][address.y].overlays[args.overlay] = false;
      });

      state.overlayRegistry[args.overlay] = [];
    },
  },
};
