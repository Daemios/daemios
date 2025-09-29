<template>
  <v-layout class="character-slide align-end">
    <!-- Avatar sigil -->
    <div class="character-slide__avatar" :style="`--accent-color: ${accentColor}`">
      <v-sheet
        height="100"
        width="100"
        class="character-slide__avatar-shell d-flex align-center justify-center"
        color="transparent"
      >
        <v-img
          v-if="avatar_url"
          :src="avatar_url"
          height="100"
          width="100"
          class="character-slide__avatar-image"
          cover
        />
        <v-icon v-else class="character-slide__avatar-icon" size="36">
          {{ mdiHelp }}
        </v-icon>
      </v-sheet>
    </div>

    <!-- Nameplate -->
    <v-card
      class="character-slide__card glass"
      variant="flat"
      :style="`--accent-color: ${accentColor}`"
    >
      <div class="character-slide__name fantasy-heading">
        {{ nameDisplay }}
      </div>
      <div class="character-slide__title fantasy-script">
        {{ title || "" }}
      </div>
    </v-card>
  </v-layout>
</template>

<script setup>
import { computed } from "vue";
import { mdiHelp } from "@mdi/js";

const props = defineProps({
  avatar_url: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: null,
  },
});

const nameDisplay = computed(() => (props.name ? props.name : "Enter Name"));
const accentColor = computed(() => props.color || "#c8b5ff");
</script>

<style scoped>
.character-slide {
  position: relative;
  width: 304px;
  min-height: 110px;
  padding-left: 8px;
  pointer-events: none;
}

.character-slide__avatar {
  height: 110px;
  width: 110px;
  position: relative;
  isolation: isolate;
  pointer-events: all;
}

.character-slide__avatar::before,
.character-slide__avatar::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 18px;
  border: 2px solid rgba(248, 242, 211, 0.18);
  transition: opacity 200ms ease;
}

.character-slide__avatar::after {
  inset: -8px;
  border-color: rgba(248, 242, 211, 0.1);
  filter: blur(2px);
}

.character-slide__avatar-shell {
  border-radius: 16px;
  border: 2px solid var(--accent-color);
  box-shadow: 0 12px 30px rgba(10, 3, 28, 0.55), 0 0 25px rgba(243, 210, 106, 0.12);
  overflow: hidden;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, rgba(18, 10, 33, 0.9) 65%),
    linear-gradient(135deg, rgba(18, 10, 33, 0.75) 0%, rgba(57, 29, 98, 0.9) 100%);
}

.character-slide__avatar-image {
  border-radius: 12px;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.45);
}

.character-slide__avatar-icon {
  color: var(--accent-color);
}

.character-slide__card {
  position: absolute;
  left: 88px;
  bottom: 0;
  width: calc(100% - 96px);
  padding: 16px 18px 12px 30px;
  border-radius: 14px;
  border-left: 4px solid var(--accent-color);
  background: linear-gradient(135deg, rgba(18, 10, 33, 0.9) 0%, rgba(38, 19, 68, 0.95) 70%);
  box-shadow: 0 24px 45px rgba(7, 2, 20, 0.55);
  pointer-events: all;
}

.character-slide__name {
  font-size: 1.25rem;
  color: var(--fantasy-highlight);
  text-shadow: 0 0 12px rgba(243, 210, 106, 0.35);
}

.character-slide__title {
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  color: var(--fantasy-text-muted);
  text-transform: uppercase;
}
</style>
