<template>
  <v-layout class="justify-center">
    <div class="left-drawer">
      <!-- Player Character -->
      <CharacterSlide
        v-if="character"
        :name="$store.state.user.character.name"
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
import Arena from '@/components/arena/Arena';
import CharacterSlide from '@/components/character/CharacterSlide.vue';
import { mapState } from 'vuex';

export default {
  components: {
    CharacterSlide,
    Arena,
  },
  // import the character state from vuex
  computed: {
    ...mapState({
      character: (state) => state.user.character,
    }),
  },
};
</script>

<style lang="sass">
.world
  width: 100%
  max-width: 100%
</style>
