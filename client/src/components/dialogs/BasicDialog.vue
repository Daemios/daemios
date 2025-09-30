<template>
  <v-dialog
    v-model="dialogState"
    :persistent="persistent"
    :max-width="maxWidth"
    scrollable
  >
    <v-card>
      <v-card-title>
        <span class="headline"> {{ title }} ({{ keybind }}) </span>
      </v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions>
        <slot name="actions" />
        <v-spacer />
        <v-btn
          color="green darken-1"
          variant="text"
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: "-",
  },
  keybind: {
    type: String,
    default: "Not Set",
  },
  maxWidth: {
    type: [Number, String],
    default: 600,
  },
  persistent: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["update:modelValue"]);

const dialogState = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

function closeDialog() {
  dialogState.value = false;
}
</script>
