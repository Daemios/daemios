<template>
  <v-layout class="justify-center">
    <div class="left-drawer">
      <!-- Player Character -->
      <CharacterSlide
        v-if="character"
  :name="character.name"
        :color="character.race.color"
        :title="character.race.name"
        :avatar_url="character.image"
        class="mt-8 ml-8"
      />
    </div>
    <Arena />
    <div class="right-drawer">
      <!-- Turn Order (last) -->
    </div>
  </v-layout>
</template>

<script>
import Arena from '@/components/arena/Arena.vue';
import CharacterSlide from '@/components/character/CharacterSlide.vue';
import { useUserStore } from '@/stores/userStore';

export default {
  components: {
    CharacterSlide,
    Arena,
  },
  computed: {
    character() {
      return useUserStore().character;
    },
  },
};
</script>

<style lang="sass">
.world
  width: 100%
  max-width: 100%
</style>
