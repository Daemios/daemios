<template>
  <div
    v-if="$route.meta['overlay']"
    class="d-flex justify-center position-absolute bottom-0 w-100"
  >
    <div class="grey pa-1 rounded mb-1 d-flex gap-1" style="z-index: 999999">
      <v-btn
        variant="flat"
        size="x-small"
        height="30"
        width="30"
        @click="dialogs.toggleEquipment()"
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
        @click="dialogs.toggleInventory()"
      >
        <v-icon size="small">
          {{ mdiTreasureChest }}
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
        @click="dialogs.toggleOptions()"
      >
        <v-icon size="small">
          {{ mdiCog }}
        </v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { mdiTreasureChest, mdiHumanMale, mdiSword, mdiCog } from "@mdi/js";
import Equipment from "@/components/dialogs/Equipment.vue";
import Inventory from "@/components/dialogs/Inventory.vue";
import Abilities from "@/components/dialogs/Abilities.vue";
import Options from "@/components/dialogs/Options.vue";
</script>
