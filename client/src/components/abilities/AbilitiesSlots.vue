<template>
  <div class="abilities-root d-flex">
    <SlotCell
      v-for="s in resolvedSlots"
      :key="s.id"
      :slot-id="s.id"
      type="ability"
      :item="s.item"
      :label="s.label"
      :source="s.source || null"
      @dropped="onDropped"
      @click="onClick"
    />
  </div>
</template>

<script setup>
import SlotCell from "@/components/shared/SlotCell.vue";
import { computed } from "vue";

const props = defineProps({
  slots: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["ability-drop", "ability-click"]);

const resolvedSlots = computed(() => {
  if (Array.isArray(props.slots) && props.slots.length > 0) return props.slots;
  return [
    {
      id: "ability",
      label: "Ability Slot",
      item: null,
      source: null,
    },
  ];
});

function onDropped(payload) {
  emit("ability-drop", payload);
}

function onClick(item) {
  emit("ability-click", item);
}
</script>

<style scoped>
.abilities-root {
  gap: 8px;
}
.abilities-root > * {
  width: 96px;
}
</style>
