<template>
  <div>
    <!-- Inventory header removed per UX request -->

    <div v-if="Array.isArray(containers) && containers.length">
      <v-row dense>
        <v-col
          v-for="container in containers"
          :key="container.id"
          cols="12"
          md="6"
        >
          <v-sheet class="pa-2" elevation="0">
            <div class="sheet-title subtitle-1 font-weight-medium">
              {{ container.name }}
            </div>
            <div class="sheet-body">
              <InventoryGrid :container="container" />
            </div>
          </v-sheet>
        </v-col>
      </v-row>
    </div>
    <div v-else>
      <v-row>
        <v-col cols="12">
          <v-sheet class="pa-2 mb-2" elevation="0">
            <div class="sheet-title subtitle-1 font-weight-medium">
              No containers equipped
            </div>
            <div class="sheet-body">
              <div>
                Inventory will populate automatically for your active character.
              </div>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-data-iterator
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="flatInventory"
        class="overflow-hidden"
        dense
      >
        <template #default>
          <v-row class="pa-2">
            <v-col
              v-for="(item, n) in flatInventory"
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
    </div>

    <ItemDialog :item="selected" @close="selected = null" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import Item from "@/components/inventory/Item.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useUserStore } from "@/stores/userStore";
import { storeToRefs } from "pinia";
import InventoryGrid from "@/components/inventory/InventoryGrid.vue";

const userStore = useUserStore();
const { inventory } = storeToRefs(userStore);
const containers = computed(() =>
  Array.isArray(inventory.value) ? inventory.value : []
);
const flatInventory = computed(() => {
  // flatten containers -> items for legacy full-list view
  if (!Array.isArray(inventory.value)) return [];
  return inventory.value.reduce((acc, c) => acc.concat(c.items || []), []);
});

const selected = ref(null);
const itemsPerPage = ref(20);
const page = ref(1);

// no placeholder container; hide the grid when no containers are equipped

// inventory refresh is automatic; manual refresh UI removed for seamless gameplay

const numberOfPages = computed(() => {
  const len = Array.isArray(inventory.value) ? inventory.value.length : 0;
  return Math.max(1, Math.ceil(len / itemsPerPage.value));
});

watch(
  inventory,
  () => {
    const pages = numberOfPages.value;
    if (page.value > pages) page.value = pages;
  },
  { deep: true }
);

onMounted(async () => {
  // Ensure inventory is available; avoid re-fetching if cached
  await userStore.ensureInventory();
});

watch(itemsPerPage, () => {
  const pages = numberOfPages.value;
  if (page.value > pages) page.value = pages;
});
</script>

<style scoped></style>
