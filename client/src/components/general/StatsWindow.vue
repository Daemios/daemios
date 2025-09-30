<template>
  <v-card
    class="stats-window position-absolute"
    style="right: 12px; top: 32px; min-width: 320px; max-width: 420px"
  >
    <v-tabs
      v-model="tab"
      background-color="grey lighten-4"
      grow
    >
      <v-tab value="general">
        General
      </v-tab>
      <v-tab value="chunk">
        Chunk
      </v-tab>
      <!-- Add more tabs here -->
    </v-tabs>
    <v-tabs-items v-model="tab">
      <v-tab-item value="general">
        <div class="pa-4">
          <slot name="general">
            <!-- Default general stats content -->
            <pre>{{ props.generalStats }}</pre>
          </slot>
        </div>
      </v-tab-item>
      <v-tab-item value="chunk">
        <div class="pa-4">
          <slot name="chunk">
            <!-- Default chunk stats content -->
            <pre>{{ props.chunkStats }}</pre>
          </slot>
        </div>
      </v-tab-item>
      <!-- More tab items -->
    </v-tabs-items>
  </v-card>
</template>

<script setup>
import { ref } from "vue";

defineOptions({ name: "StatsWindow" });

const props = defineProps({
  generalStats: { type: [String, Object], default: "" },
  chunkStats: { type: [String, Object], default: "" },
});

const tab = ref("general");
</script>
