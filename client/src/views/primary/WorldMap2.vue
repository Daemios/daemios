<template>
  <div class="worldmap2">
    <h3>WorldMap2 — 3d2 scene (initial)</h3>
    <div class="controls">
      <label> Seed </label>
      <input v-model="seed" />

      <label> Grid radius </label>
      <input v-model.number="gridRadius" type="number" min="1" max="12" />

      <button @click="genEntities">Generate Entities</button>

      <button @click="saveToWorld">Save to world</button>
      <button @click="batchSave">Batch save</button>

      <div class="status">Status: {{ status }}</div>
    </div>

    <div class="scene-container">
      <WorldMapSceneWrapper ref="sceneWrapper" />
    </div>
    <div v-if="selectedEntity" class="selection-panel">
      <h4>Selected entity</h4>
      <div>Type: {{ selectedEntity.type }}</div>
      <div>
        Pos: q={{ selectedEntity.pos?.q }}, r={{ selectedEntity.pos?.r }}
      </div>
      <div class="sel-edit">
        <label>Name</label>
        <input v-model="selectedName" />
        <label>Description</label>
        <input v-model="selectedDesc" />
      </div>
      <div class="sel-actions">
        <button @click="centerOnSelected">Center on selected</button>
        <button @click="resetCamera">Reset view</button>
        <button @click="saveSelected">Save selected to world</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import WorldMapSceneWrapper from "@/3d2/integration/WorldMapSceneWrapper.vue";
import { populateEntities } from "@/3d2/domain/world/generator";
import { useWorldStore } from "@/stores/worldStore";

const seed = ref("demo-seed");
const gridRadius = ref(4);
const status = ref("idle");
const worldStore = useWorldStore();
const sceneWrapper = ref(null);
const selectedEntity = ref(null);
const selectedName = ref("");
const selectedDesc = ref("");

// register selection callback when wrapper becomes available
function registerSelection() {
  try {
    if (sceneWrapper.value && sceneWrapper.value.onSelect) {
      sceneWrapper.value.onSelect((ent) => {
        selectedEntity.value = ent;
        selectedName.value = ent?.data?.name ?? `${ent?.type ?? "entity"}`;
        selectedDesc.value = JSON.stringify(ent?.data ?? {});
      });
    }
  } catch (e) {
    // ignore
  }
}

// register selection once wrapper is available
onMounted(() => registerSelection());
watch(sceneWrapper, (v) => {
  if (v) registerSelection();
});

watch(gridRadius, (v) => {
  try {
    if (sceneWrapper.value && sceneWrapper.value.setGridRadius)
      sceneWrapper.value.setGridRadius(v);
  } catch (e) {
    // ignore scene call failures
  }
});

function genEntities() {
  try {
    const res = populateEntities(seed.value, gridRadius.value);
    status.value = `${Array.isArray(res) ? res.length : 0} entities generated`;
    // Keep results transient for now — the scene will later consume domain outputs
    if (sceneWrapper.value && sceneWrapper.value.showEntities) {
      try {
        sceneWrapper.value.showEntities(res);
      } catch (e) {
        // ignore if scene not ready
      }
    }
  } catch (e) {
    console.error("populateEntities failed", e);
    status.value = `generate error: ${e && e.message ? e.message : String(e)}`;
  }
}

async function saveToWorld() {
  try {
    status.value = "saving...";
    await worldStore.importLocationsFromGenerator(seed.value, gridRadius.value);
    status.value = "saved to world";
  } catch (e) {
    console.error("saveToWorld failed", e);
    status.value = `save error: ${e && e.message ? e.message : String(e)}`;
  }
}

async function saveSelected() {
  if (!selectedEntity.value) return;
  try {
    status.value = "saving selected...";
    const e = selectedEntity.value;
    const payload = {
      hexQ: e.pos?.q ?? 0,
      hexR: e.pos?.r ?? 0,
      type: e.type,
      name: selectedName.value ?? e.data?.name ?? `${e.type}`,
      description: (() => {
        try {
          return JSON.parse(selectedDesc.value);
        } catch (e) {
          return selectedDesc.value;
        }
      })(),
    };
    await worldStore.createLocation(payload);
    status.value = "saved selected";
  } catch (err) {
    status.value = `save error: ${err?.message ?? String(err)}`;
  }
}

function centerOnSelected() {
  if (!selectedEntity.value) return;
  try {
    const q = selectedEntity.value.pos?.q;
    const r = selectedEntity.value.pos?.r;
    if (sceneWrapper.value && sceneWrapper.value.centerOn)
      sceneWrapper.value.centerOn(q, r);
  } catch (e) {
    /* ignore */
  }
}

function resetCamera() {
  try {
    if (sceneWrapper.value && sceneWrapper.value.resetView)
      sceneWrapper.value.resetView();
  } catch (e) {
    /* ignore */
  }
}

async function batchSave() {
  try {
    status.value = "batch saving...";
    if (worldStore && worldStore.importLocationsBatch) {
      await worldStore.importLocationsBatch(seed.value, gridRadius.value);
    } else {
      await worldStore.importLocationsFromGenerator(
        seed.value,
        gridRadius.value
      );
    }
    status.value = "batch saved";
  } catch (e) {
    status.value = `batch save error: ${e?.message ?? String(e)}`;
  }
}
</script>

<style scoped>
.worldmap2 {
  padding: 12px;
}
.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.scene-container {
  height: 560px;
  border: 1px solid #222;
}
.status {
  font-family: monospace;
}
</style>
