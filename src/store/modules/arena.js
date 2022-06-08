import Vue from 'vue';

export default {
  namespaced: true,
  state: {
    debug: false,
    combat: false,
    playerActive: true,
    moving: false,
    showTurn: false,
    entities: null,
    map: null,
    entityRegistry: [],
    plannedPath: [],
    confirmedPath: [],
    activeRegister: { x: 7, y: 7, index: 0 },
    overlayRegistry: {
      validDestination: [],
      targeting: [],
      confirmedPath: [],
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
      state.entities[state.activeRegister.x][state.activeRegister.y].active = false;

      // Activate and register new active entity
      state.activeRegister = args;
      state.entities[args.x][args.y].active = true;

      // Activate the cosmetic turn indicator and disable it after a little while
      state.showTurn = true;
      setTimeout(() => {
        state.showTurn = false;
      }, 2000);
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
    setConfirmedPath(state) {
      state.confirmedPath = state.plannedPath;
      state.confirmedPath.forEach((coordinates) => {
        state.overlayRegistry.confirmedPath.push(coordinates);
        const args = {
          ...coordinates,
          overlay: 'confirmedPath',
          boolean: true,
        };
        this.commit('arena/setOverlay', args);
      });
    },
    moveEntity(state, teleport = false) {

      if (state.plannedPath.length > 0 && !state.moving) {
        this.commit('arena/clearOverlay', 'validDestination');
        this.commit('arena/setConfirmedPath');
        state.moving = true;

        if (teleport) {
          // this.dispatch('arena/moveTeleport');
        } else {
          this.dispatch('arena/moveByCell');
        }
      }
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
    clearOverlayAt(state, args) {
      // Iterate through coordinates and clear overlays
      if (state.overlayRegistry[args.overlay]) {
        state.map[args.x][args.y].overlays[args.overlay] = false;
      }
      const index = state.overlayRegistry[args.overlay].findIndex((entry) => (
        entry.x === args.x && entry.y === args.y
      ));
      state.overlayRegistry[args.overlay][index] = [];
    },
    entityMouseOver(state, args) {
      state.entities[args.x][args.y].hover = true;
    },
    entityMouseOut(state, args) {
      state.entities[args.x][args.y].hover = false;
    },
  },
  actions: {
    moveByCell(context) {
      if (context.state.confirmedPath.length > 0) {
        const { x } = context.state.confirmedPath[0];
        const { y } = context.state.confirmedPath[0];

        setTimeout(() => {
          // Remove the OLD active entity from the entity registry and replace with new entry
          const index = context.state.entityRegistry.findIndex((entry) => (
            entry.x === context.state.activeRegister.x && entry.y === context.state.activeRegister.y
          ));
          Vue.set(context.state.entityRegistry, index, { x, y }); // preserves reactivity

          // Copy the active entity to a new position
          Vue.set(context.state.entities[x], y,
            context.state.entities[context.state.activeRegister.x][context.state.activeRegister.y]);

          Vue.set(
            context.state.entities[context.state.activeRegister.x],
            context.state.activeRegister.y,
            null,
          );
          Vue.set(context.state, 'activeRegister', { x, y });

          // Clean up the state and overlays
          context.state.confirmedPath.splice(0, 1);
          context.commit('clearOverlayAt', {
            overlay: 'confirmedPath',
            x,
            y,
          });

          // Recurse
          context.dispatch('moveByCell');
        }, 500);
      } else {
        // Movement is done, so we can reactivate pathing and do any cleanup required
        Vue.set(context.state, 'moving', false);
      }
    },
    moveTeleport() {},
  },
};
