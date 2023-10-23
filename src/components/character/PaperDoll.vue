<template>

  <div class="flex-grow-0">

    <div class="doll-grid">

      <!-- Trinkets -->
      <div class="trinkets d-flex">
        <!-- Additional Items -->
        <DollSlot
          :item="$store.state.user.character.equipped.trinket1"
          left
          @click="selected = $store.state.user.character.equipped.trinket1"
        />
        <DollSlot
          :item="$store.state.user.character.equipped.trinket2"
          left
          @click="selected = $store.state.user.character.equipped.trinket2"
        />
        <DollSlot
          :item="$store.state.user.character.equipped.trinket3"
          left
          @click="selected = $store.state.user.character.equipped.trinket3"
        />
      </div>

      <!-- Left Column -->
      <DollSlot
        label="Head"
        :item="$store.state.user.character.equipped.head"
        left
        @click="selected = $store.state.user.character.equipped.head"
      />
      <DollSlot
        label="Shoulders"
        :item="$store.state.user.character.equipped.shoulders"
        left
        @click="selected = $store.state.user.character.equipped.shoulders"
      />
      <DollSlot
        label="Back"
        :item="$store.state.user.character.equipped.back"
        left
        @click="selected = $store.state.user.character.equipped.back"
      />
      <DollSlot
        label="Chest"
        :item="$store.state.user.character.equipped.chest"
        left
        @click="selected = $store.state.user.character.equipped.chest"
      />

      <!-- Avatar -->
      <v-card class="avatar d-flex align-center justify-center">
        <v-icon>
          {{ mdiClose }}
        </v-icon>
      </v-card>

      <!-- Right Column -->
      <DollSlot
        label="Hands"
        :item="$store.state.user.character.equipped.hands"
        right
        @click="selected = $store.state.user.character.equipped.hands"
      />
      <DollSlot
        label="Waist"
        :item="$store.state.user.character.equipped.waist"
        right
        @click="selected = $store.state.user.character.equipped.waist"
      />
      <DollSlot
        label="Legs"
        :item="$store.state.user.character.equipped.legs"
        right
        @click="selected = $store.state.user.character.equipped.legs"
      />
      <DollSlot
        label="Feet"
        :item="$store.state.user.character.equipped.feet"
        right
      />

      <!-- Weapons -->
      <DollSlot
        label="mainhand"
        :item="$store.state.user.character.equipped.mainhand"
        class="weapon-mainhand"
        @click="selected = {...$store.state.user.character.equipped.mainhand}"
      />
      <DollSlot
        label="offhand"
        :item="$store.state.user.character.equipped.offhand"
        class="weapon-offhand"
        @click="selected = {...$store.state.user.character.equipped.offhand}"
      />
    </div>

    <!-- Equipment Item Dialog -->
    <ItemDialog
      :item="selected"
      @close="selected = null"
    />

  </div>
</template>

<script>
import { mdiClose } from '@mdi/js';
import DollSlot from '@/components/character/DollSlot';
import ItemDialog from '@/components/inventory/ItemDialog';

export default {
  components: {
    DollSlot,
    ItemDialog,
  },
  data: () => ({
      mdiClose,
      selected: null,
  })
};
</script>

<style lang="sass">
$column-width: 100px

.doll-grid
  display: grid
  grid-template-columns: $column-width auto auto $column-width
  grid-auto-rows: $column-width
  grid-gap: .5rem
  grid-auto-flow: dense
  min-width: 650px
  max-width: 650px

  .trinkets
    grid-column: span 4

  .weapon-mainhand, .weapon-offhand
    grid-column: span 2
    height: $column-width

  .avatar
    grid-column: 2/4
    grid-row: span 4

    span
      width: 100% !important
      height: 100% !important

    .v-icon__svg
      width: 100% !important
      height: 100% !important

</style>
