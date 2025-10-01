<template>
  <div class="intro-shop">
    <h2>Welcome to the Shop</h2>
    <p>Pick an elemental stone and tune its shape, range and type.</p>

    <div class="shop-grid">
      <div class="shop-hero">
        <img
          :src="imgPath(currentElement)"
          :alt="currentElement.name || 'element'"
        >
        <h3>
          {{ currentElement.name || 'Unknown' }}
        </h3>
        <p
          class="desc"
        >
          {{ currentElement.description || currentElement.effect || '' }}
        </p>
        <button
          class="primary"
          @click="takeThis"
        >
          I want this one!
        </button>
      </div>

      <div class="shop-options">
        <section>
          <h4>Shapes</h4>
          <div class="options">
            <button
              v-for="s in shapes"
              :key="s.id"
              class="opt"
              :class="{ sel: selectedShapeId===s.id }"
              @click="selectedShapeId=s.id"
            >
              {{ s.name }}
            </button>
            <p
              v-if="!shapes.length"
              class="muted"
            >
              No shapes
            </p>
          </div>
        </section>

        <section>
          <h4>Ranges</h4>
          <div class="options">
            <button
              v-for="r in ranges"
              :key="r.id"
              class="opt"
              :class="{ sel: selectedRangeId===r.id }"
              @click="selectedRangeId=r.id"
            >
              {{ r.name }}
            </button>
            <p
              v-if="!ranges.length"
              class="muted"
            >
              No ranges
            </p>
          </div>
        </section>

        <section>
          <h4>Types</h4>
          <div class="options">
            <button
              v-for="t in types"
              :key="t.id"
              class="opt"
              :class="{ sel: selectedTypeId===t.id }"
              @click="selectedTypeId=t.id"
            >
              {{ t.name }}
            </button>
            <p
              v-if="!types.length"
              class="muted"
            >
              No types
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, computed, onMounted } from 'vue';
import { useAbilityStore } from '@/stores/abilityStore';

const props = defineProps({
  frame: { type: Object, default: () => ({}) },
  advance: { type: Function, default: null },
});

const abilityStore = useAbilityStore();
const shapes = computed(() => abilityStore.shapes || []);
const ranges = computed(() => abilityStore.ranges || []);
const types = computed(() => abilityStore.types || []);
const elements = computed(() => abilityStore.elements || []);

const selectedIndex = ref(0);
const selectedShapeId = ref(null);
const selectedRangeId = ref(null);
const selectedTypeId = ref(null);

onMounted(async () => {
  try {
    await abilityStore.loadAll();
  } catch (e) {
    // non-fatal: ability data failed to load
    // console for diagnostics
    // eslint-disable-next-line no-console
    console.warn('IntroShopWrapper: failed to load ability data', e);
  }
});

const currentElement = computed(() => elements.value[selectedIndex.value] || { name: 'Unknown', img: 'fire.png', description: '' });

function imgPath(el) {
  if (!el) return '';
  if (typeof el === 'string') return `/img/elemental_stones/${el}`;
  if (el.img) return el.img.startsWith('/') ? el.img : `/img/elemental_stones/${el.img}`;
  return `/img/elemental_stones/${(el.name || '').toLowerCase()}.png`;
}

function takeThis() {
  const payload = { element: currentElement.value, shapeId: selectedShapeId.value, rangeId: selectedRangeId.value, typeId: selectedTypeId.value };
  window.dispatchEvent(new CustomEvent('ability-selected', { detail: payload }));
  if (typeof props.advance === 'function') props.advance();
  else window.dispatchEvent(new CustomEvent('done'));
}
</script>

<style scoped>
.stub-cutscene { padding: 12px; color: white }
.actions { margin-top: 12px }
</style>
