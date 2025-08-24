<template>
  <v-dialog
    v-model="isInventoryOpen"
    app
    fullscreen
    persistent
  >
    <v-card>
      <v-toolbar
        dark
        color="primary"
      >
        <v-btn
          icon
          dark
          @click="toggleInventory()"
        >
          <v-icon>
            {{ mdiClose }}
          </v-icon>
        </v-btn>
        <v-toolbar-title>
          Inventory (I)
        </v-toolbar-title>
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
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="inventory"
        :search="search"
  :sort-by="[ sortBy.toLowerCase() ]"
        :sort-desc="sortDesc"
        class="overflow-hidden"
      >
        <template #header>
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
            <template v-if="mdAndUp">
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
        <template #default>
          <v-row
            dense
            class="pa-2"
          >
            <v-col
              v-for="(item, n) in inventory"
              :key="n"
              cols="6"
              sm="4"
              md="3"
              lg="2"
            >
              <Item
                :item="item"
                :label="item.label"
                @click="selected = { ...item }"
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

<script setup>
import { ref, computed, watch } from "vue";
import { mdiClose, mdiMagnify, mdiArrowUp, mdiArrowDown } from "@mdi/js";
import Item from "@/components/inventory/Item.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useDialogsStore } from "@/stores/dialogsStore";
import { useUserStore } from "@/stores/userStore";
import { useDisplay } from "vuetify";
import { storeToRefs } from "pinia";

const { mdAndUp } = useDisplay();

// Icons and iterator state
const selected = ref(null);
const itemsPerPage = ref(20);
const search = ref("");
// filter (unused) intentionally omitted
const sortDesc = ref(false);
const page = ref(1);
const sortBy = ref("Label");
const keys = ["Label", "Rarity", "Quantity"];

// Stores
const dialogsStore = useDialogsStore();
const userStore = useUserStore();
const { isInventoryOpen } = storeToRefs(dialogsStore);
const { inventory } = storeToRefs(userStore);

const numberOfPages = computed(() => {
  const len = Array.isArray(inventory.value) ? inventory.value.length : 0;
  return Math.max(1, Math.ceil(len / itemsPerPage.value));
});
function toggleInventory() {
  dialogsStore.toggleInventory();
}

watch(
  inventory,
  () => {
    const pages = numberOfPages.value;
    if (page.value > pages) page.value = pages;
  },
  { deep: true }
);

watch(itemsPerPage, () => {
  const pages = numberOfPages.value;
  if (page.value > pages) page.value = pages;
});
</script>

<style></style>
