<template>
  <v-card class="container-tabs w-100" rounded="xl" elevation="3">
    <template v-if="hasContainers">
      <v-tabs
        v-model="active"
        class="container-tabs__tabs"
        color="primary"
        density="comfortable"
        bg-color="transparent"
      >
        <v-tab
          v-for="container in normalizedContainers"
          :key="containerKey(container)"
          :value="containerKey(container)"
          class="text-none"
        >
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center section-gap-sm">
              <v-icon size="22" class="me-2">{{ containerIcon(container) }}</v-icon>
              <div class="d-flex flex-column align-start">
                <span class="text-subtitle-2 font-weight-medium">
                  {{ container.name }}
                </span>
                <span class="text-caption text-medium-emphasis">
                  {{ containerItemCount(container) }} / {{ container.capacity }} slots
                </span>
              </div>
            </div>
          </div>
        </v-tab>
      </v-tabs>
      <v-divider />
      <v-window v-model="active" class="container-tabs__window">
        <v-window-item
          v-for="container in normalizedContainers"
          :key="`window-${containerKey(container)}`"
          :value="containerKey(container)"
        >
          <v-sheet color="transparent" class="pa-4">
            <div class="d-flex flex-column section-gap-md">
              <div class="d-flex flex-wrap justify-space-between align-center section-gap-md">
                <div class="d-flex flex-column">
                  <span class="text-h6 font-weight-medium">{{ container.name }}</span>
                  <span
                    v-if="container.description"
                    class="text-body-2 text-medium-emphasis"
                  >
                    {{ container.description }}
                  </span>
                </div>
                <div class="d-flex flex-wrap section-gap-sm">
                  <v-chip
                    v-for="label in containerRestrictionLabels(container)"
                    :key="`${containerKey(container)}-${label}`"
                    size="small"
                    color="secondary"
                    variant="tonal"
                    class="text-uppercase font-weight-medium me-2 mb-2"
                  >
                    {{ label }} Only
                  </v-chip>
                  <v-chip size="small" variant="outlined" class="me-2 mb-2">
                    {{ containerItemCount(container) }} / {{ container.capacity }}
                    used
                  </v-chip>
                </div>
              </div>
              <v-alert
                v-if="restrictionSummary(container)"
                density="comfortable"
                variant="tonal"
                color="secondary"
                border="start"
                class="mb-2"
              >
                {{ restrictionSummary(container) }}
              </v-alert>
              <v-sheet
                class="container-grid pa-4 rounded-xl"
                color="surface-variant"
                border
              >
                <v-row class="ma-0" dense>
                  <v-col
                    v-for="(slot, index) in containerSlots(container)"
                    :key="`${containerKey(container)}-slot-${index}`"
                    cols="6"
                    sm="4"
                    md="3"
                    lg="2"
                    class="pb-4"
                  >
                    <div class="h-100">
                      <Item
                        v-if="slot"
                        :item="decorateItem(slot, container)"
                        :label="slotLabel(slot)"
                        class="h-100"
                        @click="openItem(slot, container)"
                      />
                      <v-card
                        v-else
                        class="empty-slot h-100 d-flex flex-column align-center justify-center pa-4"
                        color="transparent"
                        variant="outlined"
                      >
                        <v-icon color="primary" size="26" class="mb-2">
                          {{ mdiBackpack }}
                        </v-icon>
                        <span class="text-caption text-medium-emphasis text-uppercase">
                          Empty Slot
                        </span>
                      </v-card>
                    </div>
                  </v-col>
                </v-row>
              </v-sheet>
            </div>
          </v-sheet>
        </v-window-item>
      </v-window>
    </template>
    <v-card-text v-else class="py-10 text-center">
      <div class="d-flex flex-column align-center section-gap-sm">
        <v-icon size="32" color="primary">{{ mdiBackpack }}</v-icon>
        <span class="text-subtitle-1 font-weight-medium">
          Your character does not have any containers yet.
        </span>
        <span class="text-body-2 text-medium-emphasis">
          Venture into the world to discover packs, belts, and satchels to expand
          your carrying capacity.
        </span>
      </div>
    </v-card-text>
    <ItemDialog :item="selectedItem" @close="selectedItem = null" />
  </v-card>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { mdiBackpack, mdiBottleTonicPlusOutline } from "@mdi/js";
import Item from "@/components/inventory/Item.vue";
import ItemDialog from "@/components/inventory/ItemDialog.vue";
import { useUserStore } from "@/stores/userStore";

const iconByTemplate = {
  "potion-belt": mdiBottleTonicPlusOutline,
  "starter-backpack": mdiBackpack,
};

const userStore = useUserStore();
const { containers } = storeToRefs(userStore);

const normalizedContainers = computed(() =>
  Array.isArray(containers.value) ? containers.value : [],
);

const hasContainers = computed(() => normalizedContainers.value.length > 0);
const active = ref(null);
const selectedItem = ref(null);

watch(
  normalizedContainers,
  (value) => {
    if (!value.length) {
      active.value = null;
      selectedItem.value = null;
      return;
    }
    const keys = value.map((container) => containerKey(container));
    if (!keys.includes(active.value)) {
      active.value = keys[0];
    }
  },
  { immediate: true, deep: true },
);

watch(active, () => {
  selectedItem.value = null;
});

function containerKey(container) {
  if (!container) return "";
  const key = container.id ?? container.templateKey ?? container.name ?? "";
  return String(key);
}

function containerIcon(container) {
  const key = container?.templateKey || "starter-backpack";
  return iconByTemplate[key] || mdiBackpack;
}

function containerItemCount(container) {
  return Array.isArray(container?.items) ? container.items.length : 0;
}

function containerRestrictionLabels(container) {
  const tags = container?.allowedItemTags;
  if (!Array.isArray(tags) || !tags.length) return [];
  return tags.map(formatTag);
}

function restrictionSummary(container) {
  const labels = containerRestrictionLabels(container);
  if (!labels.length) return "";
  if (labels.length === 1) {
    return `Only accepts ${labels[0].toLowerCase()} items.`;
  }
  const base = labels.map((label) => label.toLowerCase());
  const last = base.pop();
  return `Only accepts ${base.join(", ")}${base.length ? " and " : ""}${last} items.`;
}

function formatTag(tag) {
  return String(tag || "")
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function containerSlots(container) {
  const capacity = Number(container?.capacity) || 0;
  const items = Array.isArray(container?.items) ? [...container.items] : [];
  items.sort((a, b) => {
    const aIndex = a?.slotIndex ?? a?.slot ?? a?.id ?? 0;
    const bIndex = b?.slotIndex ?? b?.slot ?? b?.id ?? 0;
    return aIndex - bIndex;
  });
  return Array.from({ length: capacity }, (_, index) => items[index] || null);
}

function slotLabel(item) {
  if (!item) return "Empty";
  return item.label || item.name || "Item";
}

function decorateItem(item, container) {
  if (!item) return null;
  const label = item.label || item.name || "Item";
  return {
    ...item,
    label,
    slot: container?.name || item.slot,
    containerName: container?.name,
  };
}

function openItem(item, container) {
  const decorated = decorateItem(item, container);
  if (decorated) {
    selectedItem.value = decorated;
  }
}
</script>

<style scoped>
.container-tabs {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
}

.container-grid {
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
}

.container-grid .empty-slot {
  border-style: dashed;
}

.section-gap-sm {
  gap: 0.75rem;
}

.section-gap-md {
  gap: 1.5rem;
}
</style>
