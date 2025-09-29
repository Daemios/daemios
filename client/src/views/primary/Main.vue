<template>
  <v-layout class="justify-center">
    <div class="left-drawer">
      <!-- Player Character -->
      <CharacterSlide
        v-if="character && character.race"
        :name="character?.name || ''"
        :color="character?.race?.color || '#888'"
        :title="character?.race?.name || ''"
        :avatar_url="character?.image || ''"
        class="mt-8 ml-8"
      />
    </div>
    <div class="right-drawer">
      <!-- Turn Order (last) -->
    </div>
  </v-layout>
</template>

<script setup>
import CharacterSlide from "@/components/character/CharacterSlide.vue";
import { useUserStore } from "@/stores/userStore";
import { storeToRefs } from "pinia";

const userStore = useUserStore();
const { character } = storeToRefs(userStore);
</script>

<style>
.world {
  width: 100%;
  max-width: 100%;
}

.left-drawer,
.right-drawer {
  min-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  gap: 18px;
}

.left-drawer::before,
.right-drawer::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 24px;
  border: 1px solid rgba(233, 198, 120, 0.12);
  background: linear-gradient(135deg, rgba(18, 10, 33, 0.55), rgba(43, 23, 78, 0.35));
  filter: blur(0.5px);
  opacity: 0.85;
  z-index: -1;
}

.left-drawer,
.right-drawer {
  position: relative;
}
</style>
