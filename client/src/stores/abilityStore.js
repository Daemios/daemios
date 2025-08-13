import { defineStore } from 'pinia';
import api from '@/functions/api';

export const useAbilityStore = defineStore('ability', {
  state: () => ({
    elements: null,
    ranges: null,
    types: null,
    shapes: null,
  }),
  actions: {
    async getElements() {
      const response = await api.get('ability/elements');
      this.elements = response;
    },
  },
});
