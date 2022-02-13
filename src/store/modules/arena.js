export default {
  namespaced: true,
  state: {
    active: { x: 7, y: 7 }, // TODO entity ID instead??
    activeEntityId: 0,
    plannedPath: [[1, 2]],
    map: null,
    entities: null,
  },
  mutations: {
    setActive(state, active) {
      state.active = active;
    },
    setMap(state, map) {
      state.map = map;
    },
    setCellPathHighlight(state, positionArray) {
      state.map[positionArray[0]][positionArray[1]].validDestination = true;
    },
    setEntities(state, entities) {
      state.entities = entities;
    },
    appendPath(state, cellPosition) {
      state.plannedPath.push(cellPosition);
    },
    setPath(state, path) {
      state.plannedPath = path;
    },
    clearPath(state) {
      state.plannedPath = [];
    },
  },
};
