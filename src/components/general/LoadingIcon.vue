<template>
  <v-img
    src="/img/branding/logo.svg"
    class="pulse-spin-animation"
  />
</template>2

<script>
</script>
<style>
@keyframes pulse-spin {
  0%, 10% { transform: scale(1); }
  5%, 15% { transform: scale(1.2); }
  20% { transform: rotate(0deg) scale(1); }
  30% { transform: rotate(0deg) scale(1); }
  90% { transform: rotate(1440deg) scale(1); }
  100% { transform: rotate(1440deg) scale(1); }
}
.pulse-spin-animation { animation: pulse-spin 7s cubic-bezier(0.1, 0.7, 0.1, 1) infinite; }
</style>