<template>
  <!-- Gear Slot Dialog -->
  <v-dialog v-model="open" max-width="800px" content-class="item-dialog">
    <v-card class="item-slot-dialog">
      <!-- TODO make this img only be a small part and animate it to float -->
      <!-- TODO background color based on rarity with a circular darken effect on edges -->
      <v-img :src="safeShow.img" aspect-ratio="1.7778" />
      <div class="item-info white--text pa-2">
        <!-- Stats -->
        <div v-if="safeShow.stats" class="stats d-flex">
          <div v-for="(stat, n) in show.stats" :key="n" class="stat mb-3">
            <div class="subtitle-2 text-right">
              {{ stat.label }}
            </div>
            <div class="text-h2 text-right">
              {{ stat.value }}
            </div>
          </div>
        </div>

        <!-- Effect -->
        <div v-if="safeShow.effect" class="effect">
          <div class="subtitle-2 text-right">Effect</div>
          <div class="text-right">
            {{ safeShow.effect }}
          </div>
        </div>

        <!-- Description -->
        <div v-if="safeShow.description" class="description mt-auto">
          <div class="subtitle-2 text-right">Description</div>
          <div class="text-right">
            {{ safeShow.description }}
          </div>
        </div>
      </div>
      <div class="name white--text pa-2">
        <h2>
          {{ safeShow.label }}
          <span v-if="safeShow.quantity">x{{ safeShow.quantity }}</span>
        </h2>
        <h5>{{ safeShow.slot }}</h5>
      </div>
      <div class="rarity pa-2">
        <v-chip
          :class="dialogBackground"
          class="caption font-weight-bold d-flex justify-center"
        >
          {{ safeShow.rarity }}
        </v-chip>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close"]);

// Boolean state for dialog open/close — computed from item presence.
const open = computed({
  get: () => !!props.item,
  set: (val) => {
    if (!val) emit("close");
  },
});

// Safe wrapper for template access
const safeShow = computed(() => props.item || {});

const dialogBackground = computed(() => {
  const r =
    safeShow.value && safeShow.value.rarity
      ? safeShow.value.rarity.toLowerCase()
      : "";
  return {
    "grey lighten-1 black--text": r === "common",
    "green darken-3 white--text": r === "uncommon",
    "blue accent-3 white--text": r === "rare",
    "deep-purple accent-4 white--text": r === "epic",
    "orange darken-2 white--text": r === "legendary",
  };
});
</script>

<style>
.item-dialog {
  position: relative;
}
.item-dialog .v-response__content {
  background: white;
}
.item-dialog .item-info,
.item-dialog .name,
.item-dialog .rarity {
  position: absolute;
}
.item-dialog .item-info {
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  width: 250px;
  display: flex;
  flex-direction: column;
  overflow-y: scroll;
  scrollbar-width: none;
}
.item-dialog .item-info::-webkit-scrollbar {
  display: none;
}
.item-dialog .item-info .stats {
  gap: 0.5rem;
}
.item-dialog .name {
  top: 6px;
  left: 12px;
  width: calc(100% - 12px);
}
.item-dialog .rarity {
  bottom: 6px;
  left: 12px;
  width: calc(100% - 12px);
}
.item-dialog .rarity .v-chip {
  width: 90px;
}
</style>
