<template>
  <div>
    <div class="text-h6 mb-4">Keybinds</div>

    <v-row>
      <v-col cols="12">
        <v-expansion-panels
          v-model="expanded"
          multiple
        >
          <v-expansion-panel
            v-for="cat in categories"
            :key="cat.key"
            elevation="0"
            class="pa-0"
            style="border:1px solid rgba(0,0,0,0.08); border-radius:6px; margin-bottom:8px;"
          >
            <v-expansion-panel-title>
              {{ cat.title }}
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div>
                <div
                  v-for="kb in cat.bindings"
                  :key="kb.id"
                  class="py-1"
                >
                  <div class="d-flex align-center">
                    <div
                      class="pl-6 py-0 text-body-2"
                      style="width: 140px; min-width: 110px; max-width: 140px; display: inline-block;"
                    >
                      {{ kb.label }}
                    </div>

                    <div class="flex-grow-1 d-flex justify-end">
                      <v-btn
                        variant="outlined"
                        color="primary"
                        class="ma-0"
                        style="width: 100%; max-width: 120px;"
                        @click="startListening(kb.id)"
                      >
                        <span v-if="listeningId === kb.id">
                          Press any key...
                        </span>
                        <span v-else>
                          {{ bindings[kb.id] }}
                        </span>
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';

// Dummy bindings to demonstrate UI
const bindings = reactive({
  moveForward: 'W',
  moveBack: 'S',
  openInventory: 'I',
  toggleMap: 'M',
});

const categories = [
  {
    key: 'movement',
    title: 'Movement',
    bindings: [
      { id: 'moveForward', label: 'Move Forward' },
      { id: 'moveBack', label: 'Move Back' },
      { id: 'strafeLeft', label: 'Strafe Left' },
      { id: 'strafeRight', label: 'Strafe Right' },
      { id: 'sprint', label: 'Sprint' },
    ],
  },
  {
    key: 'interface',
    title: 'Interface',
    bindings: [
      { id: 'openInventory', label: 'Open Inventory' },
      { id: 'toggleMap', label: 'Toggle Map' },
      { id: 'openCharacter', label: 'Open Character' },
      { id: 'openSettings', label: 'Open Settings' },
      { id: 'toggleChat', label: 'Toggle Chat' },
    ],
  },
];

const listeningId = ref(null);

// Open all expansion panels by default (indices)
const expanded = ref(categories.map((_, i) => i));

function keyHandler(e) {
  if (!listeningId.value) return;
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  bindings[listeningId.value] = key;
  listeningId.value = null;
}

function startListening(id) {
  listeningId.value = id;
}

onMounted(() => {
  window.addEventListener('keydown', keyHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyHandler);
});
</script>
