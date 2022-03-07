<template>
  <div
    class="arena d-flex justify-center"
  >
    <div
      v-for="(column, x) in map"
      :key="x"
      class="column"
    >
      <arena-cell
        v-for="(cell, y) in column"
        :key="y"
        :cell="cell"
        :x="parseInt(x, 10)"
        :y="parseInt(y, 10)"
        @click="cellClick(x, y)"
        @cell-mouseover="cellMouseOver(x, y)"
        @cell-mouseout="cellMouseOut(x, y)"
        @entity-mouseover="entityMouseOver(x, y)"
        @entity-mouseout="entityMouseOut(x, y)"
      />
    </div>
    <ListEntityList />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import ArenaCell from '@/components/arena/ArenaCell';
import ListEntityList from '@/components/arena/ListEntityList';

export default {
  components: { ArenaCell, ListEntityList },
  data() {
    return {
      generation: {
        cell_count: 16,
        terrain: [
          'grass',
          'water',
          'stone',
        ],
      },
    };
  },
  computed: {
    ...mapState({
      map: (state) => state.arena.map,
      entities: (state) => state.arena.entities,
      active: (state) => state.arena.active,
      plannedPath: (state) => state.arena.plannedPath,
      shapeOnMouse: (state) => state.arena.shapeOnMouse,
      playerActive: (state) => state.arena.playerActive,
    }),
  },
  mounted() {
    this.generateTerrain();
    this.generateEntities();
  },
  methods: {
    // --------- Generation Helpers ---------
    randomTerrain() {
      const index = Math.floor(Math.random() * this.generation.terrain.length);
      return this.generation.terrain[index];
    },
    randomEntity() {
      const faction = Math.random() > 0.2 ? 'enemy' : 'ally';

      const actual = [{
        id: Math.floor(Math.random() * 1000000) + 1,
        owned: false,
        faction,
        name: 'Entity',
        active: false,
        life: {
          current: Math.floor(Math.random() * 10),
          max: 10,
        },
        mp: {
          current: Math.floor(Math.random() * 4) + 1,
          max: 4,
        },
        ap: {
          current: Math.floor(Math.random() * 4) + 1,
          max: 4,
        },
      }];
      return Math.random() > 0.9 ? actual : [];
    },
    generateTerrain() {
      const generate = [];

      this.iterateCells((x, y) => {
        if (y === 0) {
          generate[x] = {};
        }

        // Assign the cell data
        generate[x][y] = {
          terrain: this.randomTerrain(),
          effects: [],
          passable: Math.random() > 0.1,
          overlays: {
            validDestination: false,
            targeting: false,
          },
        };
      });

      this.$store.commit('arena/setMap', generate);
    },
    generateEntities() {
      const playerEntity = [{
        id: 0,
        owned: true,
        faction: 'player',
        name: 'Test',
        active: true,
        life: {
          current: 2,
          max: 10,
        },
        mp: {
          current: 9,
          max: 4,
        },
        ap: {
          current: 2,
          max: 4,
        },
      }];
      const entities = [];

      // Row
      this.iterateCells((x, y) => {
        if (y === 0) {
          entities[x] = {};
        }
        // Assign the cell data
        entities[x][y] = this.randomEntity();
      });

      entities[7][7] = playerEntity;

      this.$store.commit('arena/setEntities', entities);
    },

    // --------- Controls ---------
    cellClick() {
      console.log('click');
    },
    cellMouseOver(mouseX, mouseY) {
      const x = Number(mouseX);
      const y = Number(mouseY);

      // Draw shape if one is toggled onto mouse cell
      if (this.shapeOnMouse.show) {
        this.highlightShape(
          x,
          y,
          this.shapeOnMouse.radius,
          'targeting',
          this.shapeOnMouse.shape,
        );
      }

      // Draw path if you're currently active
      if (this.playerActive) {
        this.pathToCell(x, y);
      }
    },
    cellMouseOut() {
      // clear shapes
      // console.log(x, y);
    },
    entityMouseOver() {
      // console.log(x, y);
    },
    entityMouseOut() {
      // console.log(x, y);
    },

    // --------- Cartesian Helpers ---------
    checkDistance(fromX, fromY, toX, toY) {
      const distX = Math.abs(Number(fromX) - Number(toX));
      const distY = Math.abs(Number(fromY) - Number(toY));
      return distX + distY;
    },

    // --------- Map Tools ---------
    /**
     * Highlights a path on the arena from the active entity to the selected coordinate
     */
    pathToCell(toX, toY) {
      this.$store.commit('arena/clearOverlay', 'validDestination');

      const entity = this.entities[this.active.x][this.active.y][0];
      let squaresAwayFromToPos = 0;

      if (this.plannedPath && this.plannedPath.length > 0) {
        squaresAwayFromToPos = this.checkDistance(
          this.plannedPath.at(-1)[0], this.plannedPath.at(-1)[1], toX, toY,
        );
      } else {
        squaresAwayFromToPos = -1;
      }

      /**
       * First of two modes of laying out a path:
       *
       * Check to see if there's any planned movement in the buffer
       * or if we're a single cell away from the active entity
       * (or last planned move), and if so, add a record next cell into
       * path buffer
       *
       * Second of two modes of laying out a path:
       *
       * If there isn't planned movement check to see if this cell is within movement
       * range of the active turn entity's MP range
       */

      // TODO disabled for now since this requires more thought as to how this should be used
      // uses method #2 as only method atm
      if (
        false && ((squaresAwayFromToPos < 2 && squaresAwayFromToPos > 0)
        || this.checkDistance(this.active[0], this.active[1], toX, toY))
      ) {
        // Append new position to plannedPath
        this.$store.commit('arena/appendPlannedPath', [toX, toY]);
      } else {
        // Clear address path (not overlays) in prep for new path
        this.$store.commit('arena/clearPlannedPath');

        // Second path method
        if (entity.mp.current >= this.checkDistance(toX, toY, this.active.x, this.active.y)) {
          /**
           * Determines if we're moving in a positive or negative direction in the
           * respective axes on the cartesian map
           */
          const xDirection = toX >= this.active.x ? 1 : -1;
          const yDirection = toY >= this.active.y ? 1 : -1;

          /**
           * Checks to see whether the X or Y should be our primary axis
           * by checking which axes from->to delta is greatest
           *
           * We also use x and y path length to loop through and plot
           * whether the cell is part of the path highlight
           */
          const xPathLength = Math.abs(toX - this.active.x);
          const yPathLength = Math.abs(toY - this.active.y);
          const xMain = xPathLength >= yPathLength;

          /**
           * Two loops generate an X- and Y- locked coordinate group
           * and set the path highlight of those cells to true
           *
           * if it's an X main, we start our x path y coordinate
           * from the origin cell's Y otherwise, we start
           * our x path from the termination's Y of the y path
           * and we do the reverse for the y path x coordinate
           */
          const xPathYCoord = xMain ? this.active.y : this.active.y + (yPathLength * yDirection);
          const yPathXCoord = xMain ? this.active.x + (xPathLength * xDirection) : this.active.y;

          for (let x = 0; x <= xPathLength; x += 1) {
            const xCoord = this.active.x + (x * xDirection);
            const coords = {
              x: xCoord,
              y: xPathYCoord,
              overlay: 'validDestination',
              boolean: true,
            };
            this.$store.commit('arena/appendPlannedPath', coords);
            this.$store.commit('arena/setOverlay', coords);
          }
          for (let y = 0; y <= yPathLength; y += 1) {
            const yCoord = this.active.y + (y * yDirection);
            const coords = {
              x: yPathXCoord,
              y: yCoord,
              overlay: 'validDestination',
              boolean: true,
            };
            this.$store.commit('arena/appendPlannedPath', coords);
            this.$store.commit('arena/setOverlay', coords);
          }
        }
      }

      return false;
    },

    /**
     * Highlights a shape on a center point, radius does not include center square.
     * Shape options include diamond, square, and cross
     *
     * @param centerX
     * @param centerY
     * @param radius
     * @param shape
     * @param overlay
     */
    highlightShape(centerX, centerY, radius, overlay = 'targeting', shape = 'diamond') {
      this.$store.commit('arena/clearOverlay', overlay);

      const x = Number(centerX);
      const y = Number(centerY);

      if (shape === 'diamond') {
        this.iterateCells((iterX, iterY) => {
          const distX = Math.abs(x - iterX);
          const distY = Math.abs(y - iterY);
          if (distX + distY <= radius) {
            this.$store.commit('arena/setOverlay', {
              x: iterX,
              y: iterY,
              overlay,
              boolean: true,
            });
          }
        });
      } else if (shape === 'square') {
        this.iterateCells((iterX, iterY) => {
          this.$store.commit('arena/setOverlay', {
            x: iterX,
            y: iterY,
            overlay,
            boolean: true,
          });
        }, x - radius, y - radius, radius);
      } else if (shape === 'cross') {
        this.iterateCells((iterX, iterY) => {
          if (iterX === x || iterY === y) {
            this.$store.commit('arena/setOverlay', {
              x: iterX,
              y: iterY,
              overlay,
              boolean: true,
            });
          }
        }, x - radius, y - radius, radius);
      }
    },
    iterateCells(callback, startX = 0, startY = 0, limit = null) {
      const limitRefined = limit === null ? this.generation.cell_count : limit * 2 + 1;

      // Row
      for (let x = startX; x < startX + limitRefined; x += 1) {
        // Cells
        for (let y = startY; y < startY + limitRefined; y += 1) {
          if (
            x >= 0
            && y >= 0
            && x < this.generation.cell_count
            && y < this.generation.cell_count
          ) {
            callback(Number(x), Number(y));
          }
        }
      }
    },
    teleport(newX, newY, oldX, oldY) {
      if (!this.arena.entities[oldX][oldY].length) {
        console.log(`No entity at grid [${oldX}|${oldY}]`);
        return false;
      }
      if (this.arena.entities[newX][newY].length) {
        console.log('Cannot override entities: ', this.arena.entities[newX][newY]);
        return false;
      }
      // TODO make more robust by selecting specific entity by ID, see arena store 'activeEntityId'
      this.arena.entities[newX][newY].push(this.arena.entities[oldX][oldY]);
      this.arena.entities[oldX][oldY] = [];

      return true;
    },
    teleportTestingWrapper(newX, newY) {
      this.teleport(newX, newY, this.$store.state.arena.active.x, this.$store.state.arena.active.y);
    },
  },
};
</script>

<style lang="sass">
.arena
  width: 100%
  position: relative

  .column
    display: flex
    flex-direction: column

  .entity-list
    position: absolute
    bottom: 2rem
    right: 0
    gap: 4px
    padding: 4px
    z-index: 3
</style>
