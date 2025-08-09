import { defineStore } from 'pinia';
import api from '@/functions/api';

export const useDataStore = defineStore('data', {
  state: () => ({
    races: null,
  }),
  actions: {
    async getRaces() {
      const response = await api.get('data/races');
      this.races = response.races;
    },
  },
});
