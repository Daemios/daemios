<template>
  <div class="test d-flex">
    <v-row>
      <v-col
        v-for="(data, i) in images"
        :key="i"
      >
        <div class="card">
          <!-- Removed Arena-related images -->
          <img
            class="background-1"
            :src="data.background"
            alt=""
          >
          <img
            class="background-2"
            :src="data.background"
            alt=""
          >
          <img
            class="hero"
            :src="data.hero"
            alt=""
          >
        </div>
      </v-col>
    </v-row>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const images = ref([
  { hero: '/img/hero-1.png', background: '/img/nebula-1.jpg' },
  { hero: '/img/weapon-1.png', background: '/img/nebula-2.jpg' },
  { hero: '/img/hero-2.png', background: '/img/nebula-3.jpg' },
]);
</script>

<style>
@keyframes animated-background-x-1 { 0% { margin-left: 0; } 50% { margin-left: 600px; } 100% { margin-left: 0; } }
@keyframes animated-background-x-2 { 0% { margin-left: -600px; } 50% { margin-left: 0; } 100% { margin-left: -600px; } }
@keyframes animated-background-y-1 { 0% { margin-top: -50%; } 25% { margin-top: -80%; } 50% { margin-top: -50%; } 25% { margin-top: -20%; } 100% { margin-top: -50%; } }
@keyframes animated-background-y-2 { 0% { margin-top: -50%; } 25% { margin-top: -80%; } 50% { margin-top: -50%; } 25% { margin-top: -20%; } 100% { margin-top: -50%; } }

.test .card {
  border: 2px solid black;
  position: relative;
  width: 344px;
  height: 600px;
  overflow: hidden;
  border-radius: 4rem;
}
.test .card .hero {
  z-index: 2;
  position: absolute;
  top: 0;
  left: 0;
  height: 600px;
  width: auto;
}
.test .card .background-1, .test .card .background-2 { width: 600px; height: auto; position: absolute; margin-top: -50%; }
.test .card .background-1 { animation: animated-background-x-1 60s infinite; animation-timing-function: linear; }
.test .card .background-2 { animation: animated-background-x-2 60s infinite; animation-timing-function: linear; margin-left: -600px; transform: scaleX(-1); }
</style>
