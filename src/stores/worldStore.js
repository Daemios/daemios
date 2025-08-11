import { defineStore } from 'pinia';
import api from '@/functions/api';

// Central world store: terrain, towns, and future world entities
export const useWorldStore = defineStore('world', {
  state: () => ({
    // Terrain cache
    terrain: null,
    // Towns
    towns: null,
    townsLoading: false,
    lastError: null,
  }),
  actions: {
    // Terrain
    async getTerrain() {
      if (this.terrain) return;
      const response = await api.get('world/terrain');
      this.terrain = response;
    },

    // Towns
    async fetchTowns() {
      try {
        this.townsLoading = true;
        this.lastError = null;
        const res = await api.get('world/town/list');
        // Accept either array or { towns: [...] }
        this.towns = Array.isArray(res) ? res : (res?.towns ?? []);
      } catch (e) {
        this.lastError = e?.message || String(e);
        this.towns = this.towns ?? [];
      } finally {
        this.townsLoading = false;
      }
    },
    async createTown(payload = null) {
      try {
        this.lastError = null;
        await api.post('world/town/create/', payload ?? {});
        // Refresh after creating
        await this.fetchTowns();
      } catch (e) {
        this.lastError = e?.message || String(e);
        throw e;
      }
    },
  },
});
