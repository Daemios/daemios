<template>
  <v-card>
    <v-navigation-drawer
      v-model="$store.state.navigation"
      :mini-variant="$store.state.navigation"
      permanent
      app
    >
      <v-list-item class="px-2">
        <v-list-item-avatar>
          <v-img src="https://randomuser.me/api/portraits/lego/1.jpg" />
        </v-list-item-avatar>

        <v-list-item-title>
          {{ $store.state.player.character.firstName }}
          {{ $store.state.player.character.lastName }}
        </v-list-item-title>
      </v-list-item>

      <v-divider />

      <v-list dense>
        <v-list-item
          v-for="route in routes"
          :key="route.path"
          :to="route.path"
          :disabled="showLock(route)"
        >
          <v-list-item-icon class="lock-anchor">
            <v-icon>
              {{ route.icon }}
            </v-icon>
            <v-icon
              v-if="showLock(route)"
              class="combat-lock"
              color="red"
            >
              {{ mdiLock }}
            </v-icon>
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>{{ route.name }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </v-card>
</template>

<script>
import { mdiChevronLeft, mdiLock } from '@mdi/js';
import { mapState } from 'vuex';

export default {
  data() {
    return {
      mdiChevronLeft,
      mdiLock,
    };
  },
  computed: {
    routes() {
      const routes = [];
      this.$router.getRoutes().forEach((route) => {
        if (route.meta.render) {
          routes.push({
            path: route.path,
            name: route.name,
            ...route.meta,
          });
        }
      });
      return routes;
    },
    ...mapState({
      combat: (state) => state.arena.combat,
    }),
  },
  methods: {
    showLock(route) {
      console.log(route);
      return route.combat_lock && this.combat;
    },
  },
};
</script>

<style lang="sass">
.lock-anchor
  position: relative
.combat-lock
  position: absolute !important
  right: -.5rem
  svg
    height: 1rem
    width: 1rem
</style>
