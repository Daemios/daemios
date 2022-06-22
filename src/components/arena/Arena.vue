<template>
  <div
    class="arena d-flex justify-center align-center"
  >
    <div
      v-for="(column, x) in terrain"
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
      />
    </div>
    <ListEntityList />
    <TurnIndicator v-if="$store.state.arena.showTurn" />
    <DebugPane v-if="$store.state.arena.debug" />
  </div>
</template>

<script>
import { mdiFire, mdiHospital } from '@mdi/js';
import { mapState } from 'vuex';
import ArenaCell from '@/components/arena/ArenaCell';
import ListEntityList from '@/components/arena/ListEntityList';
import TurnIndicator from '@/components/arena/TurnIndicator';
import DebugPane from '@/components/arena/DebugPane';

export default {
  components: {
    ArenaCell, ListEntityList, TurnIndicator, DebugPane,
  },
  computed: {
    ...mapState({
      terrain: (state) => state.arena.terrain,
      entities: (state) => state.arena.entities,
      entityRegistry: (state) => state.arena.entityRegistry,
      active: (state) => state.arena.activeRegister,
      plannedPath: (state) => state.arena.plannedPath,
      shapeOnMouse: (state) => state.arena.shapeOnMouse,
      playerActive: (state) => state.arena.playerActive,
      moving: (state) => state.arena.moving,
    }),
  },
  watch: {
    active() {
      console.log('active changed');
    },
  },
  methods: {
    // --------- Generation Helpers ---------
    randomAllyImg() {
      const images = [
        'https://i.pinimg.com/564x/51/e0/a8/51e0a8f8b1dfe4bc7a8fbac386ae0510.jpg',
        'https://i.pinimg.com/564x/43/89/60/43896082a4f5464217d028f348e11e00.jpg',
        'https://i.pinimg.com/564x/2f/36/cd/2f36cd42dcf583da901afd854ab82cf1.jpg',
        'https://i.pinimg.com/564x/db/4c/3c/db4c3cc49dc0cf8342c86d86bc3200e7.jpg',
      ];

      return images[Math.floor(Math.random() * images.length)];
    },
    randomEnemyImg() {
      const images = [
        'https://i.pinimg.com/564x/fd/83/78/fd83780c6fe297027c505ab5fda5202b.jpg',
        'https://i.pinimg.com/564x/83/15/ab/8315ab2665eeb330b3181651f8e0f88d.jpg',
        'https://i.pinimg.com/564x/09/af/62/09af6265634c97f267c09a2ecfbde158.jpg',
      ];

      return images[Math.floor(Math.random() * images.length)];
    },
    randomTerrain() {
      const index = Math.floor(Math.random() * this.generation.terrain.length);
      return this.generation.terrain[index];
    },
    randomEntity() {
      const faction = Math.random() > 0.2 ? 'enemy' : 'ally';

      return {
        id: Math.floor(Math.random() * 1000000) + 1,
        owned: false,
        faction,
        name: `Random ${faction}`,
        active: false,
        hover: false,
        img: faction === 'enemy' ? this.randomEnemyImg() : this.randomAllyImg(),
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
        effects: [
          {
            icon: mdiFire,
            description: 'Burning for 5 life at the start of unit\'s turn',
          },
          {
            icon: mdiHospital,
            description: 'Regenerating 5 life at the start of unit\'s turn',
          },
          {
            icon: mdiHospital,
            description: 'Regenerating 5 life at the start of unit\'s turn',
          },
          {
            icon: mdiHospital,
            description: 'Regenerating 5 life at the start of unit\'s turn',
          },
          {
            icon: mdiHospital,
            description: 'Regenerating 5 life at the start of unit\'s turn',
          },
        ],
        log: [
          {
            turn: 2,
            entries: [{
              message: "took 16 damage from Drizzt Do'urden",
            },
            {
              message: "took 16 damage from Drizzt Do'urden",
            },
            {
              message: "took 16 damage from Drizzt Do'urden",
            }],
          },
          {
            turn: 1,
            entries: [
              {
                message: "took 16 damage from Drizzt Do'urden",
              },
              {
                message: "took 16 damage from Drizzt Do'urden",
              },
              {
                message: "effect 'Regeneration' healed for 5 life",
              },
            ],
          },
        ],
      };
    },
    generateEntities() {
      this.$store.commit('arena/clearEntityRegistry');

      const playerEntity = {
        id: 0,
        owned: true,
        faction: 'player',
        name: 'Gamer Guy',
        img: 'https://i.pinimg.com/564x/46/22/0b/46220b30d9406bcd34e93851081e3fa5.jpg',
        active: true,
        hover: false,
        life: {
          current: 2,
          max: 10,
        },
        mp: {
          current: 8,
          max: 4,
        },
        ap: {
          current: 2,
          max: 4,
        },
      };
      // This is up here because it will force the active to be 0 index aka round start
      this.$store.commit('arena/registerEntity', { x: 7, y: 7, index: 0 });
      const entities = [];

      // Row
      this.iterateCells((x, y) => {
        if (y === 0) {
          entities[x] = {};
        }
        // Assign the cell data
        if (Math.random() > 0.97) {
          entities[x][y] = this.randomEntity();
          this.$store.commit('arena/registerEntity', { x, y });
        }
      });

      entities[7][7] = playerEntity;
      this.$store.commit('arena/setEntities', entities);
    },

    // --------- Controls ---------
    cellClick() {
      this.$store.dispatch('arena/movement')
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
      if (this.moving) {
        return false;
      }

      this.$store.commit('arena/clearOverlay', 'validDestination');

      const distance = this.checkDistance(this.active.x, this.active.y, toX, toY);

      const entity = this.entities[this.active.x][this.active.y];
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
      if (false && ((squaresAwayFromToPos < 2 && squaresAwayFromToPos > 0) || distance)) {
        // Append new position to plannedPath
        this.$store.commit('arena/appendPlannedPath', [toX, toY]);
      } else {
        // Clear planned path (not overlays, done above) in prep for new path
        this.$store.commit('arena/clearPlannedPath');

        // Second path method
        if (entity.mp.current >= this.checkDistance(toX, toY, this.active.x, this.active.y)) {
          // Comments here are verbose because it's a confusing dance of code

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
           * Determines if we're moving in a positive or negative direction in the
           * respective axes on the cartesian map
           */
          const xDirection = toX >= this.active.x ? 1 : -1;
          const yDirection = toY >= this.active.y ? 1 : -1;

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
          const yPathXCoord = xMain ? this.active.x + (xPathLength * xDirection) : this.active.x;

          // TODO This very likely can be simplified, and is a tack-on of adapted old code

          // Length of the dominant path (the one that protrudes from origin)
          const dominant = xMain ? xPathLength : yPathLength;
          // Length of the submissive path (the one that protrudes from the end of the dominant)
          const submissive = xMain ? yPathLength : xPathLength;

          /**
           * The start of the dominant line in terms of it's relevant axis.
           * X dominant lines start at the active entities X coordinate, vice versa
           */
          const dom_start = xMain ? this.active.x : this.active.y;

          // Uses pos/neg direction of each axis, determine what direction the dom/sub line moves
          const dom_direction = xMain ? xDirection : yDirection;
          const sub_direction = xMain ? yDirection : xDirection;

          // This object stores the last coordinates of the dom line
          let exit_coords = {};
          let stop = false;

          // Builds a set of coordinates along the dominant axis and sets overlays
          for (let i = 1; i <= dominant; i += 1) {
            const coords = {
              x: xMain ? (i * dom_direction) + dom_start : yPathXCoord,
              y: xMain ? xPathYCoord : (i * dom_direction) + dom_start,
            };
            if (
              this.map[coords.x][coords.y].passable
              && this.entities[coords.x] // required because y isnt built unless entity exists
              && !this.entities[coords.x][coords.y]
            ) {
              this.$store.commit('arena/appendPlannedPath', coords);
              this.$store.commit('arena/setOverlay', {
                ...coords,
                overlay: 'validDestination',
                boolean: true,
              });
              exit_coords = coords;
            } else {
              stop = true;
              break;
            }
          }

          // Same as dom, but uses exit coords instead as an origin instead of entity location
          for (let j = 1; j <= submissive; j += 1) {
            const coords = {
              x: xMain ? exit_coords.x : (j * sub_direction) + exit_coords.x,
              y: xMain ? (j * sub_direction) + exit_coords.y : exit_coords.y,
            };

            if (stop) {
              break;
            }

            if (
              this.map[coords.x][coords.y].passable
              && this.entities[coords.x] // required because y isnt built unless entity exists
              && !this.entities[coords.x][coords.y]
            ) {
              this.$store.commit('arena/appendPlannedPath', coords);
              this.$store.commit('arena/setOverlay', {
                ...coords,
                overlay: 'validDestination',
                boolean: true,
              });
            } else {
              break;
            }
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
  },
};
</script>

<style lang="sass">
.arena
  width: 100%
  height: 100%
  position: relative

  .column
    display: flex
    flex-direction: column
</style>
