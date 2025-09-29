<template>
  <div v-if="$route.meta['overlay']" class="micro-menu-shell">
    <div class="micro-menu glass">
      <v-btn
        class="micro-menu__btn"
        variant="text"
        size="small"
        height="40"
        width="44"
        @click="dialogs.toggleCharacter()"
      >
        <v-icon size="22" class="micro-menu__icon">
          {{ mdiHumanMale }}
        </v-icon>
        <span class="micro-menu__label">Hero</span>
      </v-btn>
      <div class="micro-menu__divider" />
      <v-btn
        class="micro-menu__btn"
        variant="text"
        size="small"
        height="40"
        width="44"
        @click="dialogs.toggleSettings()"
      >
        <v-icon size="22" class="micro-menu__icon">
          {{ mdiCog }}
        </v-icon>
        <span class="micro-menu__label">Relics</span>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { mdiHumanMale, mdiCog } from "@mdi/js";
import { useDialogsStore } from "@/stores/dialogsStore";

// Pinia store providing dialog toggle actions used by the micro menu
const dialogs = useDialogsStore();
</script>

<style scoped>
.micro-menu-shell {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  justify-content: center;
  width: 100%;
  pointer-events: none;
}

.micro-menu {
  display: inline-flex;
  align-items: stretch;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(21, 12, 35, 0.92) 0%, rgba(44, 23, 78, 0.92) 100%);
  border: 1px solid rgba(233, 198, 120, 0.35);
  box-shadow: 0 18px 40px rgba(4, 0, 12, 0.6);
  pointer-events: all;
}

.micro-menu__btn {
  position: relative;
  min-width: 72px;
  flex-direction: column;
  color: var(--fantasy-text);
  font-family: "Cinzel", serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: transform 180ms ease, text-shadow 180ms ease;
}

.micro-menu__btn:hover {
  transform: translateY(-2px);
  text-shadow: 0 0 12px rgba(243, 210, 106, 0.6);
}

.micro-menu__icon {
  margin-bottom: 4px;
  color: var(--fantasy-highlight);
}

.micro-menu__label {
  font-size: 0.6rem;
}

.micro-menu__divider {
  width: 1px;
  background: linear-gradient(
    180deg,
    rgba(243, 210, 106, 0.05) 0%,
    rgba(243, 210, 106, 0.55) 50%,
    rgba(243, 210, 106, 0.05) 100%
  );
  margin: 0 4px;
}
</style>
