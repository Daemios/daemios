<template>
  <div
    class="pearls"
    role="list"
    aria-label="Element carousel"
  >
    <button
      v-for="(el, i) in displayList"
      :key="(el && el.id) || el"
      class="pearl"
      :class="{ active: i === localIndex }"
      :aria-pressed="i === localIndex"
      :title="(el && el.name) || el"
      :style="pearlStyle(i)"
      @click="select(i)"
    >
      <img
        :src="imgPath(el)"
        :alt="(el && el.name) || el"
      >
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  elements: { type: Array, default: () => [] },
  fallbackImages: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const localIndex = ref(props.modelValue || 0);
watch(() => props.modelValue, (v) => { localIndex.value = v; });

const displayList = computed(() => (props.elements && props.elements.length) ? props.elements : props.fallbackImages);

function imgPath(elOrName) {
  if (!elOrName) return '';
  if (typeof elOrName === 'string') return `/img/elemental_stones/${elOrName}`;
  if (elOrName.img) {
    return elOrName.img.startsWith('/') ? elOrName.img : `/img/elemental_stones/${elOrName.img}`;
  }
  const file = `${(elOrName.name || '').toLowerCase()}.png`;
  return `/img/elemental_stones/${file}`;
}

function select(i) {
  localIndex.value = i;
  emit('update:modelValue', i);
}

function pearlStyle(i) {
  const idx = localIndex.value;
  const dist = Math.abs(i - idx);
  const max = 6;
  if (dist === 0) return { transform: 'translateY(-6px) scale(1.6) rotateZ(0deg)', opacity: 1, zIndex: 3 };
  const pct = Math.min(1, dist / max);
  const y = -6 - (pct * 14);
  const s = 1 - pct * 0.35;
  const o = Math.max(0.25, 1 - pct * 0.85);
  const rz = (i < idx ? -10 * pct : 10 * pct);
  return { transform: `translateY(${y}px) scale(${s}) rotateZ(${rz}deg)`, opacity: o, zIndex: 1 };
}
</script>

<style scoped>
.pearls { display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap; }
.pearl { background: transparent; border: none; padding:8px; border-radius:999px; transition: transform 200ms ease; position: relative; }
.pearl img { width:80px; height:80px; object-fit:contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.65)); transition: transform 220ms cubic-bezier(.2,.9,.2,1); }
.pearl.active { transform: scale(1.0); }
</style>
