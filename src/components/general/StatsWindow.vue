<template>
  <v-card
    class="stats-window"
    style="position: absolute; right: 12px; top: 32px; z-index: 10; min-width: 320px; max-width: 420px;"
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
            <pre>{{ generalStats }}</pre>
          </slot>
        </div>
      </v-tab-item>
      <v-tab-item value="chunk">
        <div class="pa-4">
          <slot name="chunk">
            <!-- Default chunk stats content -->
            <pre>{{ chunkStats }}</pre>
          </slot>
        </div>
      </v-tab-item>
      <!-- More tab items -->
    </v-tabs-items>
  </v-card>
</template>

<script>
export default {
  name: 'StatsWindow',
  props: {
    generalStats: { type: [String, Object], default: '' },
    chunkStats: { type: [String, Object], default: '' },
  },
  data() {
    return {
      tab: 'general',
    };
  },
};
</script>
