<template>
  <div
    class="arena"
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
        @click="teleportTestingWrapper"
        @cell-mouseover="pathToCell(x, y)"
        @entity-mouseover="highlightShape"
        @entity-mouseout="clearHighlights"
      />
    </div>
  </div>
</template>
<script>
import { mapState } from 'vuex';
import ArenaCell from '@/components/arena/ArenaCell';

export default {
  components: { ArenaCell },
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
      const actual = [{
        id: Math.floor(Math.random() * 1000000) + 1,
        owned: false,
        faction: Math.random() > 0.2 ? 'enemy' : 'ally',
        name: 'Random',
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
          validDestination: false,
          passable: Math.random() > 0.1,
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
    click() {
      console.log('click');
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
      // this.clearHighlights();
      const entity = this.entities[this.active.x][this.active.y][0];

      /**
       * First of two modes of laying out a path:
       *
       * Check to see if there's any planned movement in the buffer
       * or if we're a single cell away from the active entity
       * (or last planned move), and if so, add a record next cell into
       * path buffer
       */
      if (false && this.plannedPath.length) {
        // Clear existing highlights in cell data
        this.clearHighlights();

        // Iterate through buffer and apply new highlights
        this.plannedPath.forEach((movement) => {
          console.log(movement);
        });

        // if there is, check to see if its one cell away from the last entry in the buffer
        if (false) {
          // if it is, add this coordinate to the buffer and end
          // eslint-disable-next-line no-console
          console.log('cell is 1 cell');
          return true;
        }
        // if it is not, clear the buffer
      }

      /**
       * Second of two modes of laying out a path:
       *
       * If there isn't planned movement check to see if this cell is within movement
       * range of the active turn entity's MP range
       */
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
          const coords = [xCoord, xPathYCoord];
          this.$store.commit('arena/setCellPathHighlight', coords);
          this.$store.commit('arena/appendPath', coords);
        }
        // can start at 1 because the x path already filled in the first cell
        for (let y = 0; y <= yPathLength; y += 1) {
          const yCoord = this.active.y + (y * yDirection);
          const coords = [yPathXCoord, yCoord];
          this.$store.commit('arena/setCellPathHighlight', coords);
          this.$store.commit('arena/appendPath', coords);
        }
      }
      return false;
    },
    highlightShape(startX, startY, radius, shape = 'diamond', key = 'validDestination') {
      this.clearHighlights();

      const x = parseInt(startX, 10);
      const y = parseInt(startY, 10);

      if (shape === 'diamond') {
        this.iterateCells((iterX, iterY) => {
          const distX = Math.abs(Number(x) - Number(iterX));
          const distY = Math.abs(Number(y) - Number(iterY));
          if (distX + distY <= radius) {
            this.map[iterX][iterY][key] = true;
          }
        });
      } else if (shape === 'square') {
        this.iterateCells((iterX, iterY) => {
          this.map[iterX][iterY][key] = true;
        }, x - radius, y - radius, radius);
      } else if (shape === 'cross') {
        this.iterateCells((iterX, iterY) => {
          if (parseInt(iterX, 10) === parseInt(x, 10) || parseInt(iterY, 10) === parseInt(y, 10)) {
            this.map[iterX][iterY][key] = true;
          }
        }, x - radius, y - radius, radius);
      }
    },
    clearHighlights() {
      this.$store.commit('arena/clearPath');
      this.iterateCells((x, y) => {
        this.map[x][y].validDestination = null;
      });
    },
    iterateCells(callback, startX = 0, startY = 0, limit = null) {
      let limitRefined;
      if (limit === null) {
        limitRefined = this.generation.cell_count;
      } else {
        limitRefined = limit * 2 + 1;
      }

      // Row
      for (let x = startX; x < startX + limitRefined; x += 1) {
        // Cells
        for (let y = startY; y < startY + limitRefined; y += 1) {
          callback(x, y);
        }
      }
    },
    teleport(newX, newY, oldX, oldY) {
      if (!this.arena.entities[oldX][oldY].length) {
        // eslint-disable-next-line no-console
        console.log(`No entity at grid [${oldX}|${oldY}]`);
        return false;
      }
      if (this.arena.entities[newX][newY].length) {
        // eslint-disable-next-line no-console
        console.log('Cannot overrite entities: ', this.arena.entities[newX][newY]);
        return false;
      }
      this.arena.entities[newX][newY] = this.arena.entities[oldX][oldY];
      this.arena.entities[oldX][oldY] = [];

      return true;
    },
    teleportTestingWrapper(newX, newY) {
      this.teleport(newX, newY, this.arena.turnActive.x, this.arena.turnActive.y);

      // Client testing only
      this.arena.turnActive.x = parseInt(newX, 10);
      this.arena.turnActive.y = parseInt(newY, 10);
    },
  },
};
</script>
<style lang="sass">
.arena
  display: flex
  .column
    display: flex
    flex-direction: column
</style>
