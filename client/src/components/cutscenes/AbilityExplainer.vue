<template>
  <div class="ability-hero">
    <!-- Two-column layout: left inventory grid, right hero panel -->
    <div class="two-col">
      <div
        class="inventory-grid"
        role="list"
      >
        <button
          v-for="(el, i) in (elements.length ? elements : fallbackImages)"
          :key="(el && el.id) || el"
          class="inv-item"
          :class="{ selected: i === selectedIndex }"
          @click="selectedIndex = i"
        >
          <img
            :src="(typeof el === 'string') ? (`/img/elemental_stones/${el}`) : (el.img ? (el.img.startsWith('/') ? el.img : `/img/elemental_stones/${el.img}`) : `/img/elemental_stones/${(el.name||'').toLowerCase()}.png`)"
            :alt="(el && el.name) || el"
          >
        </button>
      </div>

      <!-- Right: hero panel -->
      <div class="hero-card two-col-right">
        <div class="hero-media large">
          <img
            :src="(currentElement && currentElement.img) ? (currentElement.img.startsWith('/') ? currentElement.img : `/img/elemental_stones/${currentElement.img}`) : (`/img/elemental_stones/${(currentElement.name||'unknown').toLowerCase()}.png`)"
            :alt="currentElement?.name || 'element'"
          >
        </div>
        <div class="hero-content">
          <h2
            class="hero-title"
          >
            {{ prettyName }}
          </h2>
          <p
            class="hero-desc mb-6"
          >
            {{ description }}
          </p>
          <div class="hero-actions">
            <div class="corner-btn-wrap">
              <button
                class="primary corner"
                @click="done"
              >
                I want this one!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom detail grid removed temporarily (shapes/ranges/types) -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { defineProps } from 'vue';
import { useAbilityStore } from '@/stores/abilityStore';
// PearlCarousel kept in repo for later; not used in this layout

const props = defineProps({
  frame: { type: Object, default: () => ({}) },
  advance: { type: Function, default: null },
});

// use store to fetch live data
const abilityStore = useAbilityStore();
const elements = computed(() => abilityStore.elements || []);
// shapes/ranges/types removed temporarily

// local fallback if server data not available
const fallbackImages = [
  'fire.png','water.png','earth.png','air.png','ice.png','light.png','dark.png','nature.png','poison.png','explosive.png','energy.png','blood.png','steam.png','lightning.png',
];
const fallbackNames = {
  'fire.png': 'Fire','water.png': 'Water','earth.png': 'Earth','air.png': 'Air','ice.png': 'Ice','light.png': 'Light','dark.png': 'Dark','nature.png': 'Nature',
  'poison.png': 'Poison','explosive.png': 'Explosive','energy.png': 'Energy','blood.png': 'Blood','steam.png': 'Steam','lightning.png': 'Lightning',
};

const selectedIndex = ref(0);

onMounted(async () => {
  try {
    await abilityStore.loadAll();
  } catch (e) {
    // non-fatal
    // eslint-disable-next-line no-console
    console.warn('AbilityExplainer: failed to load ability data', e);
  }
});
onBeforeUnmount(() => {});

const currentElement = computed(() => {
  if (elements.value && elements.value.length) return elements.value[selectedIndex.value] || elements.value[0];
  // fallback virtual element from local lists
  const fn = fallbackImages[selectedIndex.value % fallbackImages.length];
  return { name: fallbackNames[fn] || fn, img: fn, description: '', effect: '' };
});
const prettyName = computed(() => currentElement.value?.name || 'Unknown');
const description = computed(() => currentElement.value?.description || currentElement.value?.effect || 'A mysterious elemental stone with unique properties.');
// shortBlurb removed (was used by removed center card)

// bottom option selections removed for now

function done() {
  // dispatch a selection event so the app can handle giving the player the chosen element and options
  const payload = { element: currentElement.value || null };
  const e = new CustomEvent('ability-selected', { detail: payload });
  window.dispatchEvent(e);
  if (typeof props.advance === 'function') props.advance();
  else {
    const ev = new CustomEvent('done');
    window.dispatchEvent(ev);
  }
}

// close was previously an alias for done; removed to avoid unused symbol

// carousel styles and behavior are now in PearlCarousel.vue
</script>

<style scoped>
.ability-hero { color: #fff; padding: 18px; display:flex; flex-direction:column; gap:20px; align-items:center; }
.pearls { display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap; }
.pearl { background: transparent; border: none; padding:8px; border-radius:999px; transition: transform 200ms ease; }
.pearl img { width:80px; height:80px; object-fit:contain; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.65)); transition: transform 220ms cubic-bezier(.2,.9,.2,1); }
.pearl.active { transform: scale(1.0); }
.pearl { position: relative; }
/* inline style attribute (z-index) is applied by pearlStyle() to lift active pearl */

.hero-card { width:100%; max-width:1200px; background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); border-radius:14px; padding:18px; display:flex; gap:18px; align-items:center; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
.hero-media { width: 0; height: 0; }
.hero-content { flex:1; }
.hero-title { margin:0 0 8px 0; font-size:28px; }
.hero-desc { margin:0 0 12px 0; opacity:0.95; }
.hero-actions { display:flex; gap:10px; }
.primary { background: #6b46c1; color:#fff; border:none; padding:10px 16px; border-radius:8px; cursor:pointer; }
.secondary { background: rgba(255,255,255,0.06); color:#fff; border:none; padding:10px 12px; border-radius:8px; cursor:pointer; }

/* floating corner button (moved to bottom-right) */
.hero-card { position: relative; }
.corner-btn-wrap { position: absolute; bottom: -18px; right: 48px; display:flex; align-items:center; justify-content:center; pointer-events:auto; }
.primary.corner { padding:12px 18px; border-radius:999px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); transform: translateY(0); }

@media (max-width: 720px) {
  .corner-btn-wrap { bottom: -12px; right: 20px; }
  .primary.corner { padding:10px 14px; font-size:14px; }
}

/* detail grid and option card styles removed */

@media (max-width: 720px) {
  .hero-card { flex-direction:column; align-items:center; }
  .hero-media img { width:240px; height:240px; }
}
</style>
