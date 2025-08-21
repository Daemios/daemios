<template>
  <div
    class="control-panel"
    style="position: absolute; left: 12px; top: 12px; z-index: 2200; display:flex; gap:6px;"
    role="toolbar"
    aria-label="World map controls"
  >
    <v-btn
      size="x-small"
      variant="outlined"
      :color="debugActive ? 'primary' : undefined"
  :title="debugActive ? 'Hide debug' : 'Show debug'"
  style="min-width:28px; height:28px; padding:0 6px;"
  @click="$emit('toggle-debug')"
    >
      Debug
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'ControlPanel',
  props: {
    debugActive: { type: Boolean, default: false }
  },
  emits: ['toggle-debug']
}
</script>
