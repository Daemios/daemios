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

        <v-btn
          icon
          @click="$store.state.navigation = !$store.state.navigation"
        >
          <v-icon>{{ mdiChevronLeft }}</v-icon>
        </v-btn>
      </v-list-item>

      <v-divider />

      <v-list dense>
        <v-list-item
          v-for="route in routes"
          :key="route.path"
          :to="route.path"
        >
          <v-list-item-icon>
            <v-icon>
              {{ route.icon }}
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
import { mdiChevronLeft } from '@mdi/js';

export default {
  data() {
    return {
      mdiChevronLeft,
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
            icon: route.meta.icon,
          });
        }
      });
      return routes;
    },
  },
};
</script>
