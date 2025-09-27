<template>
  <div
    class="d-flex"
    style="min-width:640px;"
  >
    <div
      class="pa-2 d-flex flex-column"
      style="width:200px; gap:12px;"
    >
      <div
        v-for="item in items"
        :key="item.key"
        style="width:100%;"
      >
        <v-card
          :elevation="active === item.key ? 8 : 2"
          class="pa-3 d-flex flex-column"
          :outlined="active !== item.key"
          style="cursor:pointer"
          @click="select(item.key)"
        >
          <div class="text-subtitle-2 font-weight-medium">
            {{ item.title }}
          </div>
          <div class="text-caption text--secondary mt-1">
            {{ item.subtitle }}
          </div>
        </v-card>
      </div>
    </div>

    <div class="pa-4 flex-grow-1">
      <component
        :is="currentComponent"
        @close="close"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import GeneralSettings from './GeneralSettings.vue';
import AudioSettings from './AudioSettings.vue';
import GraphicsSettings from './GraphicsSettings.vue';
import KeybindsSettings from './KeybindsSettings.vue';

const props = defineProps({
  onClose: {
    type: Function,
    default: null,
  },
});

const items = [
  { key: 'general', title: 'General', subtitle: 'Basic options' },
  { key: 'audio', title: 'Audio', subtitle: 'Volume and alerts' },
  { key: 'graphics', title: 'Graphics', subtitle: 'Rendering options' },
  { key: 'keybinds', title: 'Keybinds', subtitle: 'Customize keys' },
];

const active = ref('general');

function select(k) {
  active.value = k;
}

const currentComponent = computed(() => {
  switch (active.value) {
    case 'audio':
      return AudioSettings;
    case 'graphics':
      return GraphicsSettings;
    case 'keybinds':
      return KeybindsSettings;
    default:
      return GeneralSettings;
  }
});

function close() {
  if (props.onClose) props.onClose();
}
</script>
