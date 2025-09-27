<template>
  <div>
    <div class="text-h6 mb-4">
      Keybinds
    </div>
    <v-row>
      <v-col cols="12">
        <v-expansion-panels v-model="expanded" multiple>
          <v-expansion-panel
            v-for="cat in categories"
            :key="cat.key"
            elevation="0"
            class="pa-0"
            style="
              border: 1px solid rgba(0, 0, 0, 0.08);
              border-radius: 6px;
              margin-bottom: 8px;
            "
          >
            <v-expansion-panel-title>
              {{ cat.title }}
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div>
                <div v-for="kb in cat.bindings" :key="kb.id" class="py-1">
                  <div class="d-flex align-center">
                    <div
                      class="pl-6 py-0 text-body-2"
                      style="
                        width: 140px;
                        min-width: 110px;
                        max-width: 140px;
                        display: inline-block;
                      "
                    >
                      {{ kb.label }}
                    </div>

                    <div class="flex-grow-1 d-flex justify-end">
                      <v-btn
                        variant="outlined"
                        color="primary"
                        class="ma-0"
                        style="width: 100%; max-width: 120px"
                        @click="startListening(kb.id)"
                      >
                        <span v-if="listeningId === kb.id">
                          Press any key...
                        </span>
                        <span v-else>
                          {{ display(kb.id) }}
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

    <!-- bindings persist immediately when captured; no separate save/export UI here -->
  </div>
</template>

<script setup>
import { ref } from "vue";

// ...existing code...
import { keybinds } from "@/utils/keybinds";
import keybindsConfig from "@/config/keybindsConfig";

// Map into categories using config
const categories = keybindsConfig.reduce((acc, entry) => {
  // infer category by a simple rule: ids with move* -> movement else interface
  const catKey = entry.id.startsWith("move") ? "movement" : "interface";
  let cat = acc.find(c => c.key === catKey);
  if (!cat) {
    cat = { key: catKey, title: catKey === "movement" ? "Movement" : "Interface", bindings: [] };
    acc.push(cat);
  }
  cat.bindings.push({ id: entry.id, label: entry.label });
  return acc;
}, []);

const listeningId = ref(null);

// Open all expansion panels by default (indices)
const expanded = ref(categories.map((_, i) => i));

function startListening(id) {
  listeningId.value = id;
  // begin capture via keybinds module
  keybinds.startCapture(id).then((combo) => {
    // combo captured; UI will update from keybinds.getDisplay
    console.log("Captured combo for", id, combo);
    listeningId.value = null;
  });
}

// keybinds is started/stopped centrally in App.vue; do not start/stop here

function display(id) {
  return keybinds.getDisplay(id) || "Unbound";
}

// resetDefaults available on keybinds module if needed elsewhere

// no explicit export/save functions — keybinds.persist on set
</script>
