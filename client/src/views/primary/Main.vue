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
import CharacterSlide from '@/components/character/CharacterSlide.vue';
import { useUserStore } from '@/stores/userStore';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { character } = storeToRefs(userStore);
</script>

<style>
.world { width: 100%; max-width: 100%; }
</style>
