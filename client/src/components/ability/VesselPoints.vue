<template>
  <div class="block-counter">
    <div class="blocks container">
      <div
        v-for="n in 9"
        :key="n"
        :class="classes(n)"
      />
    </div>
    <div class="operations">
      <v-btn
        dark
        dense
        x-small
        width="20"
        class="pa-0"
        :disabled="limit === 0"
        @click="increment()"
      >
        <v-icon
          dense
          x-small
        >
          {{ mdiPlus }}
        </v-icon>
      </v-btn>

      <v-btn
        dark
        x-small
        :disabled="current - 1 < start && positiveOnly"
        @click="decrement()"
      >
        <v-icon
          dense
          x-small
        >
          {{ mdiMinus }}
        </v-icon>
      </v-btn>

    </div>
  </div>
</template>
<script setup>
import { mdiPlus, mdiMinus } from '@mdi/js';
import { ref, onMounted } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  limit: {
    type: Number,
    required: true,
  },
  start: {
    type: Number,
    required: true,
  },
  positiveOnly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['input']);

const current = ref(null);

onMounted(() => {
  current.value = props.start;
});

function increment() {
  current.value += 1;
  emit('input', current.value);
}

function decrement() {
  current.value -= 1;
  emit('input', current.value);
}

function classes(n) {
  return {
    black: props.start >= n,
    'green lighten-2': current.value >= n && n > props.start,
    'red lighten-2': (
      current.value < props.start
      && n > current.value
      && n <= props.start
    ),
  };
}
</script>
<style>
.block-counter { display: grid; grid-template-columns: 1fr auto; }
.block-counter .operations { display: flex; flex-direction: column; justify-content: space-between; padding: .25rem 0 .25rem .25rem; }
.block-counter .blocks { padding: .5rem; display: grid; grid-template-columns: 15px 15px 15px; grid-template-rows: 15px 15px 15px; grid-gap: 3px; }
.block-counter .blocks .block.temporary { background: rgba(255,255,255,.4); }
.block-counter .blocks .block.active { background: rgba(255,255,255,.8); }
</style>

