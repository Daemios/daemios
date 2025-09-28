<template>
  <v-card
    ref="wrapper"
    class="item d-flex align-center justify-center"
    :class="itemClasses"
    :style="cardStyle"
    flat
    tile
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
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
    <teleport :to="portalSelector">
      <div v-if="showStats" :style="panelStyle">
        <ItemTooltip :item="statsItem" />
      </div>
    </teleport>
  </v-card>
</template>

<script setup>
import { computed, ref } from "vue";
import ItemTooltip from "@/components/inventory/ItemTooltip.vue";

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

const showStats = ref(false);

// Build a stats-focused item object. Include capacity data if item represents a container.
const statsItem = computed(() => {
  const it = props.item || {};
  const out = { ...it };
  // prefer direct capacity, then nested container.capacity, then containerCapacity
  if (out.capacity == null) {
    if (out.container && out.container.capacity != null)
      out.capacity = out.container.capacity;
    else if (out.containerCapacity != null)
      out.capacity = out.containerCapacity;
  }
  return out;
});

const wrapper = ref(null);
const panelStyle = ref({
  position: "absolute",
  top: "0px",
  left: "0px",
  display: "none",
});
const portalSelector = ref("body");
let portalAnchor = null;

function handleMouseEnter() {
  try {
    showStats.value = true;
    const el =
      wrapper.value && wrapper.value.$el ? wrapper.value.$el : wrapper.value;
    if (el && el.getBoundingClientRect) {
      // find nearest positioned ancestor (offsetParent) to insert portal
      const offsetParent = el.offsetParent || document.body;
      // create an anchor for teleport if needed and use its selector
      if (!portalAnchor || portalAnchor.parentNode !== offsetParent) {
        if (portalAnchor && portalAnchor.parentNode)
          portalAnchor.parentNode.removeChild(portalAnchor);
        portalAnchor = document.createElement("div");
        portalAnchor.style.position = "relative";
        offsetParent.appendChild(portalAnchor);
      }
      // set teleport target to the anchor we created
      portalSelector.value = portalAnchor;

      const parentRect = offsetParent.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const gap = 6;

      // compute coordinates relative to offsetParent
      let left = r.left - parentRect.left;
      let top = r.bottom - parentRect.top + gap;

      // clamp within parent
      left = Math.max(4, Math.min(left, parentRect.width - 4));
      if (top + 8 > parentRect.height) {
        // place above if not enough space
        top = r.top - parentRect.top - gap - 8;
        top = Math.max(4, top);
      }

      panelStyle.value = {
        position: "absolute",
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        display: "block",
      };
    } else {
      panelStyle.value = { position: "absolute", display: "block" };
    }
  } catch (err) {
    console.warn("item stats show failed", err);
    showStats.value = true;
    panelStyle.value = { position: "absolute", display: "block" };
  }
}

function handleMouseLeave() {
  showStats.value = false;
  panelStyle.value = {
    position: "absolute",
    top: "0px",
    left: "0px",
    display: "none",
  };
  try {
    if (portalAnchor && portalAnchor.parentNode)
      portalAnchor.parentNode.removeChild(portalAnchor);
  } catch (e) {
    /* ignore */
  }
  portalAnchor = null;
  portalSelector.value = "body";
}

function onClick() {
  emit("click");
}

const itemLabelClasses = computed(() => ({
  "has-img": props.item && props.item.img,
}));

const safeImg = computed(() => {
  const raw = props.item && props.item.img;
  if (!raw) return "/img/debug/placeholder.png";
  try {
    // If the image is a remote URL (http(s):) or data URI, return as-is.
    const lower = String(raw).toLowerCase();
    if (
      lower.startsWith("http://") ||
      lower.startsWith("https://") ||
      lower.startsWith("data:")
    ) {
      return raw;
    }
    // If the path is already absolute within the app (starts with /), return as-is.
    if (String(raw).startsWith("/")) return raw;
    // Otherwise assume it's a local path missing a leading slash and normalize it
    return `/${raw}`;
  } catch (e) {
    return "/img/debug/placeholder.png";
  }
});

function onImgError(e) {
  try {
    const src = (e && e.target && e.target.currentSrc) || safeImg.value;
    // Provide more context for debugging common failures (relative paths, missing files)
    console.debug("[Item] image load failed", {
      id: props.item && props.item.id,
      label: props.item && props.item.label,
      rawImgProp: props.item && props.item.img,
      resolvedSrc: src,
      elementSrcAttr:
        e && e.target && e.target.getAttribute && e.target.getAttribute("src"),
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
