<template>
  <div
    :class="dollSlotClasses"
    @dragover.prevent
    @drop="onDrop"
  >
    <template v-if="props.item">
      <DraggableItem
        :item="safeItem"
        :label="label"
        :source="{ equip: true, slot: label }"
      />
    </template>
    <template v-else>
      <Item
        :label="label"
        :class="dollSlotClasses"
        :item="safeItem"
        @click="() => emit('click')"
      />
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Item from "@/components/inventory/Item.vue";
import DraggableItem from "@/components/inventory/DraggableItem.vue";

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  slotName: {
    type: String,
    default: null,
  },
  left: {
    type: Boolean,
    default: false,
  },
  right: {
    type: Boolean,
    default: false,
  },
});

// consolidated emits
const emit = defineEmits(["click", "equip-item"]);

const dollSlotClasses = computed(() => ({
  "doll-left": props.left,
  "doll-right": props.right,
}));

const label = computed(() => {
  // use explicit slotName if provided (preferred), otherwise fallback to item.slot
  return props.slotName || (props.item && props.item.slot) || "";
});

const safeItem = computed(() => props.item || {});

// emit already defined above

function onDrop(e) {
  try {
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    const payload = JSON.parse(raw);
    // payload: { type: 'item', item, source }
    if (payload && payload.type === 'item') {
      // emit equip-item so parent (PaperDoll) can handle equipping
      // include target slot label for context
      emit('equip-item', { item: payload.item, source: payload.source, targetSlot: label.value });
    }
  } catch (err) {
    console.warn('doll drop failed', err);
  }
}
</script>

<style>
.doll-left {
  grid-column: 1;
}
.doll-right {
  grid-column: 4;
}
</style>
