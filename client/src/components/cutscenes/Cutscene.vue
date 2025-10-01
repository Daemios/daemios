<template>
  <div
    v-if="visible"
    class="cutscene-overlay"
    role="dialog"
    aria-modal="true"
  >
    <div class="cutscene-container">
      <div
        v-if="frameType === 'dialog'"
        class="dialog"
      >
        <img
          v-if="actorImage"
          :src="actorImage"
          alt="actor"
          class="actor-img"
        >
        <div class="bubble">
          <div class="name">
            {{ actorName }}
          </div>
          <div class="line">
            {{ dialogLine }}
          </div>
        </div>
      </div>

      <div
        v-else-if="frameType === 'text'"
        class="text-frame"
      >
        <h2
          class="cinzel--heading"
        >
          {{ textContent }}
        </h2>
      </div>

      <div
        v-else-if="frameType === 'custom'"
        class="custom-frame"
      >
        <component
          :is="loadedCustom"
          v-if="loadedCustom"
          :frame="currentFrame"
          :advance="advance"
          @done="onCustomDone"
        />
        <div
          v-else
        >
          Loading...
        </div>
      </div>

      <div
        v-else
        class="empty-frame"
      />

      <div class="controls">
        <div
          v-if="waitingConfirm"
          class="confirm"
        >
          <button
            @click="confirm"
          >
            {{ confirmText || 'OK' }}
          </button>
        </div>
        <button
          v-else-if="waitingManual"
          @click="advance"
        >
          Next
        </button>
        <!-- empty placeholder for inline controls -->
      </div>
    </div>

    <!-- fixed bottom centered skip button -->
    <div class="cutscene-skip-wrapper">
      <button
        aria-label="Skip cutscene"
        class="skip"
        @click="skip"
      >
        Skip
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import audioService from '@/services/audioService';
import { useAudioStore } from '@/stores/audioStore';

const props = defineProps({ script: { type: Object, required: true } });
const emit = defineEmits(['finished', 'skipped']);

const router = useRouter();
const audioStore = useAudioStore();

// Runner state
const visible = ref(true);
const index = ref(0);
const dialogIndex = ref(0);
const loadedCustom = ref(null);
const waitingManual = ref(false);
const waitingConfirm = ref(false);
const confirmText = ref('');
let autoTimer = null;
let eventHandlers = [];

function clearTimer() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
}

function schedule(ms, fn) {
  clearTimer();
  if (!ms || ms <= 0) { fn(); return; }
  autoTimer = setTimeout(() => { autoTimer = null; fn(); }, ms);
}

function addListener(ev, cb) {
  window.addEventListener(ev, cb);
  eventHandlers.push({ ev, cb });
}

function removeAllListeners() {
  eventHandlers.forEach(({ ev, cb }) => window.removeEventListener(ev, cb));
  eventHandlers = [];
}

const frames = computed(() => props.script?.frames || []);
const currentFrame = computed(() => frames.value[index.value] || null);
const frameType = computed(() => {
  const f = currentFrame.value; if (!f) return null;
  if (f.type === 'dialog' || f.dialog) return 'dialog';
  if (f.type === 'text' || f.text) return 'text';
  if (f.type === 'custom_component' || f.custom_component || f.component) return 'custom';
  return f.type || null;
});

// Dialog helpers
const dialogSeq = computed(() => (currentFrame.value && Array.isArray(currentFrame.value.dialog) ? currentFrame.value.dialog : []));
const dialogItem = computed(() => dialogSeq.value[dialogIndex.value] || null);
const actorName = computed(() => {
  const it = dialogItem.value; if (!it) return '';
  return Object.keys(it)[0] || '';
});
const dialogLine = computed(() => {
  const it = dialogItem.value; if (!it) return '';
  return it[Object.keys(it)[0]] || '';
});
const actorImage = computed(() => {
  const actors = props.script?.actors || {};
  const name = actorName.value; if (!name) return null;
  const a = actors[name] || actors[name.toLowerCase()] || null;
  return a ? a.image : null;
});

// Text helpers
const textContent = computed(() => {
  const f = currentFrame.value; if (!f) return ''; return (f.text && f.text.string) || f.text || '';
});

// Audio
function playFrameAudio(f) {
  if (!f || !f.audio) return;
  const a = f.audio; const src = a.src || a;
  if ((a.channel || 'sfx') === 'music') audioService.fadeIn(src, { duration: 400, loop: !!a.loop }).catch(() => {});
  else {
    const vol = Math.max(0, Math.min(1, (audioStore.volume || 100) / 100));
    const sfx = new Audio(src); sfx.volume = vol; sfx.play().catch(()=>{});
  }
}

async function loadCustom(c) {
  loadedCustom.value = null;
  if (!c) { return; }
  if (typeof c === 'function') {
    loadedCustom.value = defineAsyncComponent(c);
    return;
  }
  if (typeof c === 'object') {
    const comp = c.component || c;
    if (typeof comp === 'function') {
      loadedCustom.value = defineAsyncComponent(comp);
    } else {
      loadedCustom.value = comp;
    }
    return;
  }
  try {
    loadedCustom.value = defineAsyncComponent(() => import(/* @vite-ignore */ c));
  } catch (e) {
    loadedCustom.value = null;
  }
}

function resolveTrigger(obj, frame) {
  if (!obj) return null;
  if (obj.trigger) return obj.trigger;
  if (obj.text && obj.text.trigger) return obj.text.trigger;
  return frame && (frame.type === 'dialog' ? { next: 'manual' } : { next: 'delay', delay: 3000 });
}

function waitTrigger(trigger) {
  if (!trigger) return Promise.resolve();
  if (trigger.next === 'delay') return new Promise((res) => schedule(trigger.delay || 3000, res));
  if (trigger.next === 'event') return new Promise((res) => { const h = () => { window.removeEventListener(trigger.event, h); res(); }; addListener(trigger.event, h); });
  if (trigger.next === 'confirm') return new Promise((res) => {
    const showAfter = trigger.delay && Number(trigger.delay) > 0 ? Number(trigger.delay) : 0;
    schedule(showAfter, () => { confirmText.value = trigger.text || 'Confirm'; waitingConfirm.value = true; const done = () => { waitingConfirm.value = false; res(); }; manualCleanup = done; });
  });
  if (trigger.next === 'manual' || trigger.next === 'click') return new Promise((res) => { waitingManual.value = true; manualCleanup = () => { waitingManual.value = false; res(); }; });
  return Promise.resolve();
}

let manualCleanup = null;
function advance() {
  if (manualCleanup) { manualCleanup(); manualCleanup = null; }
  // progress dialog or frame
  if (frameType.value === 'dialog') {
    if (dialogIndex.value < dialogSeq.value.length - 1) { dialogIndex.value += 1; return; }
    dialogIndex.value = 0;
    index.value += 1; return;
  }
  index.value += 1;
}

function confirm() { if (manualCleanup) { manualCleanup(); manualCleanup = null; } }

function skip() { removeAllListeners(); clearTimer(); visible.value = false; emit('skipped'); }

function onCustomDone() { advance(); }

async function runFrame() {
  removeAllListeners(); clearTimer(); waitingManual.value = false; waitingConfirm.value = false; manualCleanup = null;
  const f = currentFrame.value; if (!f) { visible.value = false; emit('finished'); return; }
  // redirect
  if (f.type === 'redirect' && f.url) {
    try {
      router.push(f.url);
    } catch (e) {
      // fallback to full navigation
      window.location.href = f.url;
    }
    visible.value = false;
    emit('finished');
    return;
  }
  playFrameAudio(f);
  if (f.dialog) {
    dialogIndex.value = 0;
    while (dialogIndex.value < dialogSeq.value.length) {
      const item = dialogSeq.value[dialogIndex.value];
      const trg = resolveTrigger(item, f);
      await waitTrigger(trg, { type: 'dialog' });
      // if waitingManual was set, we wait until user clicks which calls manualCleanup via advance()
      if (!waitingManual.value) { dialogIndex.value += 1; }
      else { return; }
    }
    // finished dialog
    index.value += 1; return;
  }
  if (f.type === 'custom_component' || f.custom_component || f.component) {
    const comp = f.custom_component || f.component;
    await loadCustom(comp);
    const trg = resolveTrigger(f.custom_component || f, f);
    await waitTrigger(trg, { type: 'custom' });
    if (!waitingManual.value) { index.value += 1; }
    return;
  }
  // text or default
  const trg = resolveTrigger(f, f);
  await waitTrigger(trg, { type: 'frame' });
  if (!waitingManual.value) { index.value += 1; }
}

watch(index, () => { runFrame(); });
watch(dialogIndex, () => {});

onMounted(() => { runFrame(); });
</script>

<style scoped>
.cutscene-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.65); z-index:9999; }
.cutscene-container { max-width:1100px; width:100%; padding:24px; box-sizing:border-box; color: #fff; display:flex; flex-direction:column; align-items:center; gap:12px; pointer-events: auto; }
.dialog { display:flex; align-items:flex-start; gap:12px; }
.actor-img { width:80px; height:80px; object-fit:cover; border-radius:8px; }
.bubble { background: rgba(0,0,0,0.65); padding:12px 16px; border-radius:10px; max-width:80%; }
.name{ font-weight:700; margin-bottom:6px; }
.controls { display:flex; gap:8px; align-items:center; pointer-events: auto; }
.confirm { background: rgba(255,255,255,0.06); padding:8px 10px; border-radius:8px; display:flex; gap:8px; align-items:center; pointer-events: auto; }
.cinzel { font-family: 'CinzelDecorative-Regular', serif; }
.cutscene-skip-wrapper { position: fixed; left: 50%; transform: translateX(-50%); bottom: 28px; z-index: 10001; pointer-events: auto; }
.skip { background: rgba(255,255,255,0.06); color: #fff; border: none; padding: 10px 18px; border-radius: 999px; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.5); font-weight:600; }
</style>
