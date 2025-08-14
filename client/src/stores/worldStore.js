import { defineStore } from 'pinia';
import api from '@/utils/api';

// Central world store: terrain, locations, and future world entities
// Location model:
// {
//   chunkX, chunkY, hexQ, hexR, type, name, description, visibility, owner, specialization
// }
export const useWorldStore = defineStore('world', {
  state: () => ({
    worldSeed: null,
    locations: null,
    locationsLoading: false,
    lastError: null,
  }),
  actions: {
    // World seed
    setWorldSeed(seed) {
      this.worldSeed = seed;
    },
    async fetchWorldSeed() {
      try {
        this.lastError = null;
        const res = await api.get('world/seed');
        this.worldSeed = res?.seed ?? null;
      } catch (e) {
        this.lastError = e?.message || String(e);
        this.worldSeed = null;
      }
    },

    // Locations
    async fetchLocations() {
      try {
        this.locationsLoading = true;
        this.lastError = null;
        const res = await api.get('world/locations');
        // Accept either array or { locations: [...] }
        this.locations = Array.isArray(res) ? res : (res?.locations ?? []);
      } catch (e) {
        this.lastError = e?.message || String(e);
        this.locations = this.locations ?? [];
      } finally {
        this.locationsLoading = false;
      }
    },
    async createLocation(payload = null) {
      try {
        this.lastError = null;
        await api.post('world/locations', payload ?? {});
        // Refresh after creating
        await this.fetchLocations();
      } catch (e) {
        this.lastError = e?.message || String(e);
        throw e;
      }
    },
  },
});
