<template>
  <v-card
    class="item d-flex align-center justify-center pa-1"
    :class="itemClasses"
  >
    <v-btn
      depressed
      :color="item.color ? item.color : null"
      class="slot-item overflow-hidden pa-0"
      @click="$emit('click')"
    >

      <div
        v-if="!item.img"
        class="d-flex flex-column"
      >
        <v-icon class="mb-1">
          {{ mdiAlertCircleOutline }}
        </v-icon>
        No Image
      </div>
      <v-img
        v-else-if="item.img"
        :src="item.img"
        :aspect-ratio="1.7778"
      />
      <v-icon v-else>
        {{ mdiMinus }}
      </v-icon>
    </v-btn>
    <div
      class="item-label"
      :class="itemLabelClasses"
    >
      {{ item.label }} <span v-if="item.quantity">- {{ item.quantity }}</span>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { mdiClose, mdiMinus, mdiAlertCircleOutline } from '@mdi/js';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  item: {
    type: Object,
    default: null,
  },
});

const itemClasses = computed(() => ({
  white: true,
  'green accent-4': props.item.rarity.toLowerCase() === 'uncommon',
  'blue accent-3': props.item.rarity.toLowerCase() === 'rare',
  'deep-purple accent-4': props.item.rarity.toLowerCase() === 'epic',
  'orange darken-1': props.item.rarity.toLowerCase() === 'legendary',
}));

const itemLabelClasses = computed(() => ({
  'has-img': props.item.img,
}));
</script>

<style>
.item { position: relative; width: 100%; height: 100%; }
.item .item-label {
  position: absolute;
  padding: 2px 2px 12px 2px;
  width: calc(100% - 8px);
  top: 4px;
  left: 4px;
  right: 4px;
  font-size: 10px;
  text-transform: uppercase;
  border-radius: 0;
  pointer-events: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.item .item-label.has-img {
  color: white;
  background: linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4), rgba(0,0,0,.4), rgba(0,0,0,0));
}
.item button { height: 100% !important; width: 100% !important; }
</style>
