<template>
  <v-dialog
    v-model="dialogState"
    persistent
    max-width="600px"
  >
    <v-card>
      <v-card-title>
        <span class="headline">{{ title }} ({{ keybind }})</span>
      </v-card-title>
      <v-card-text>
        <!-- This is the slot for parent content -->
        <slot />
      </v-card-text>
      <v-card-actions>
        <slot name="actions" />
        <v-spacer />
        <v-btn
          color="green darken-1"
          text
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    value: { // This prop is used to handle v-model binding
      type: Boolean,
      required: true
    },
    title: {
      type: String,
      default: '-'
    },
    keybind: {
      type: String,
      default: 'Not Set'
    }
  },
  computed: {
    // We use a Vuex state variable as a model for the dialog's visibility
    dialogState: {
      get() {
        return this.value;
      },
      set(value) {
        // This event updates the parent component's state variable
        this.$emit('input', value);
      }
    }
  },
  methods: {
    closeDialog() {
      this.$emit('input', false); // Close dialog by emitting false
    }
  }
};
</script>