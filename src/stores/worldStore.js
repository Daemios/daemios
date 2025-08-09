import { defineStore } from 'pinia';
import api from '@/functions/api';

export const useWorldStore = defineStore('world', {
  state: () => ({ terrain: null }),
  actions: {
    async getTerrain() {
      if (this.terrain) return;
      const response = await api.get('world/terrain');
      this.terrain = response;
    }
  }
});
