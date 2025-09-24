<template>
  <v-card
    class="item d-flex align-center justify-center"
    :class="itemClasses"
    :style="cardStyle"
    flat
    tile
  >
    <v-btn
      depressed
      :color="safeItem.color ? safeItem.color : null"
      :draggable="draggable"
      class="slot-item overflow-hidden pa-0 w-100 h-100 d-flex align-center justify-center"
      @click="onClick"
      @dragstart="onDragStart ? onDragStart : null"
    >
      <v-img
        :src="safeImg"
        cover
        :alt="safeItem.label || 'item image'"
        class="w-100 h-100"
        elevation="0"
        @error="onImgError"
      />
    </v-btn>

    <div class="item-label" :class="itemLabelClasses">
      {{ safeItem.label }}
      <span v-if="safeItem.quantity">- {{ safeItem.quantity }}</span>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  item: {
    type: Object,
    default: () => ({}),
  },
  width: {
    type: [Number, String],
    default: undefined,
  },
  height: {
    type: [Number, String],
    default: undefined,
  },
  draggable: {
    type: Boolean,
    default: false,
  },
  onDragStart: {
    type: Function,
    default: null,
  },
});

const itemClasses = computed(() => ({
  // color by rarity, but avoid forcing a white background which creates elevation contrast
  "green accent-4":
    props.item &&
    props.item.rarity &&
    props.item.rarity.toLowerCase() === "uncommon",
  "blue accent-3":
    props.item &&
    props.item.rarity &&
    props.item.rarity.toLowerCase() === "rare",
  "deep-purple accent-4":
    props.item &&
    props.item.rarity &&
    props.item.rarity.toLowerCase() === "epic",
  "orange darken-1":
    props.item &&
    props.item.rarity &&
    props.item.rarity.toLowerCase() === "legendary",
}));

const cardStyle = computed(() => {
  const s = {};
  if (props.width !== undefined && props.width !== null) {
    s.width =
      typeof props.width === "number" ? `${props.width}px` : props.width;
  }
  if (props.height !== undefined && props.height !== null) {
    s.height =
      typeof props.height === "number" ? `${props.height}px` : props.height;
  }
  return s;
});

const emit = defineEmits(["click"]);

function onClick() {
  emit("click");
}

const itemLabelClasses = computed(() => ({
  "has-img": props.item && props.item.img,
}));

const safeImg = computed(() => {
  if (props.item && props.item.img) return props.item.img;
  // fallback to debug placeholder in client public
  return "/img/debug/placeholder.png";
});

function onImgError(e) {
  try {
    const src = (e && e.target && e.target.currentSrc) || safeImg.value;
    console.debug("[Item] image load failed", {
      id: props.item && props.item.id,
      label: props.item && props.item.label,
      src,
    });
  } catch (err) {
    console.warn("Item image error handler failed", err);
  }
}

// Safe item wrapper so template can safely access properties even when parent
// explicitly passes null (Vue will not use prop default if the parent provided null).
const safeItem = computed(() => props.item || {});
</script>

<style>
.item {
  position: relative;
  width: 100%;
  height: 100%;
  /* Ensure minimum sizing so child v-img can compute layout */
  min-width: 40px;
  min-height: 40px;
}
.item .item-label {
  position: absolute;
  /* make label flush with the true edges of the item */
  padding: 4px 4px 8px 4px;
  width: 100%;
  top: 0;
  left: 0;
  right: 0;
  font-size: 10px;
  text-transform: uppercase;
  border-radius: 0;
  pointer-events: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.item .item-label.has-img {
  color: white;
  background: linear-gradient(
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0.4),
    rgba(0, 0, 0, 0)
  );
}
.item button {
  height: 100% !important;
  width: 100% !important;
}

/* Ensure Vuetify's button content isn't collapsed to 0x0 */
.slot-item > .v-btn__content {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>
