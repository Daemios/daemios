<template>
  <v-dialog
    v-model="$store.state.dialogs.isInventoryOpen"
    persistent
    fullscreen
    app
  >
    <v-card>
      <v-toolbar
        dark
        color="primary"
      >
        <v-btn
          icon
          dark
          @click="$store.commit('dialogs/toggleInventory')"
        >
          <v-icon>{{ mdiClose }}</v-icon>
        </v-btn>
        <v-toolbar-title>Inventory (I)</v-toolbar-title>
        <v-spacer />
        <v-toolbar-items>
          <v-btn
            dark
            text
            @click="dialog = false"
          >
            Add
          </v-btn>
        </v-toolbar-items>
      </v-toolbar>
      <v-data-iterator
        :items.sync="$store.state.player.character.inventory"
        :items-per-page.sync="numberOfPages"
        :page.sync="page"
        :search="search"
        :sort-by="sortBy.toLowerCase()"
        :sort-desc="sortDesc"
        class="overflow-hidden"
      >
        <template v-slot:header>
          <v-toolbar
            dark
            color="blue darken-3"
            class="mb-1"
          >
            <v-text-field
              v-model="search"
              clearable
              flat
              solo-inverted
              hide-details
              :prepend-inner-icon="mdiMagnify"
              label="Search"
            />
            <template v-if="$vuetify.breakpoint.mdAndUp">
              <v-spacer />
              <v-select
                v-model="sortBy"
                flat
                solo-inverted
                hide-details
                :items="keys"
                :prepend-inner-icon="mdiMagnify"
                label="Sort by"
              />
              <v-spacer />
              <v-btn-toggle
                v-model="sortDesc"
                mandatory
              >
                <v-btn
                  large
                  depressed
                  color="blue"
                  :value="false"
                >
                  <v-icon>{{ mdiArrowUp }}</v-icon>
                </v-btn>
                <v-btn
                  large
                  depressed
                  color="blue"
                  :value="true"
                >
                  <v-icon>{{ mdiArrowDown }}</v-icon>
                </v-btn>
              </v-btn-toggle>
            </template>
          </v-toolbar>
        </template>
        <template
          v-slot:default
        >
          <v-row
            dense
            class="pa-2"
          >
            <v-col
              v-for="(item, n) in $store.state.player.character.inventory"
              :key="n"
              cols="6"
              sm="4"
              md="3"
              lg="2"
            >
              <Item
                :item="item"
                :label="item.label"
                @click="selected = {...item}"
              />
            </v-col>
          </v-row>
        </template>
      </v-data-iterator>

      <!-- Inventory Item Dialog -->
      <ItemDialog
        :item="selected"
        @close="selected = null"
      />
    </v-card>
  </v-dialog>
</template>

<script>
import {
  mdiClose, mdiChevronLeft, mdiChevronRight, mdiMagnify, mdiArrowUp, mdiArrowDown,
} from '@mdi/js';
import Item from '@/components/inventory/Item';
import ItemDialog from '@/components/inventory/ItemDialog';

export default {
  components: {
    Item,
    ItemDialog,
  },
  data() {
    return {
      // Icons
      mdiClose,
      mdiChevronLeft,
      mdiChevronRight,
      mdiMagnify,
      mdiArrowUp,
      mdiArrowDown,

      // Item dialog data
      selected: null,

      // Iterator Data
      itemsPerPage: 20,
      itemsPerPageArray: [20, 40, 60],
      search: '',
      filter: {},
      sortDesc: false,
      page: 1,
      sortBy: 'name',
      keys: [
        'Label',
        'Rarity',
        'Quantity',
      ],
    };
  },
  computed: {
    numberOfPages() {
      return Math.ceil(this.$store.state.player.character.inventory.length / this.itemsPerPage);
    },
    filteredKeys() {
      return this.keys.filter((key) => key !== 'Name');
    },
  },
  methods: {
    nextPage() {
      if (this.page + 1 <= this.numberOfPages) this.page += 1;
    },
    formerPage() {
      if (this.page - 1 >= 1) this.page -= 1;
    },
    updateItemsPerPage(number) {
      this.itemsPerPage = number;
    },
  },
};
</script>

<style lang="sass">
</style>
