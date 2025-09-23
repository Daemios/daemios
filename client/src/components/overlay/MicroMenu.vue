<template>
  <div
    v-if="$route.meta['overlay']"
    class="d-flex justify-center position-absolute bottom-0 w-100"
  >
    <v-btn-group class="grey pa-1 rounded mb-1">
      <v-btn
        variant="flat"
        size="x-small"
        height="30"
        width="30"
        @click="dialogs.toggleCharacter()"
      >
        <v-icon size="small">
          {{ mdiHumanMale }}
        </v-icon>
      </v-btn>
      <v-btn
        variant="flat"
        size="x-small"
        height="30"
        width="30"
        @click="dialogs.toggleAbilities()"
      >
        <v-icon size="small">
          {{ mdiSword }}
        </v-icon>
      </v-btn>
      <v-btn
        variant="flat"
        size="x-small"
        height="30"
        width="30"
        @click="dialogs.toggleSettings()"
      >
        <v-icon size="small">
          {{ mdiCog }}
        </v-icon>
      </v-btn>
    </v-btn-group>
  </div>
</template>

<script setup>
import { mdiHumanMale, mdiSword, mdiCog } from "@mdi/js";
import { useDialogsStore } from "@/stores/dialogsStore";

// Pinia store providing dialog toggle actions used by the micro menu
const dialogs = useDialogsStore();
</script>
