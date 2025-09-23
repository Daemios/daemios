import { defineStore } from "pinia";
import api from "@/utils/api";
import router from "@/router/index.js";

export const useUserStore = defineStore("user", {
  state: () => ({
    displayName: null,
    characters: null,
    character: {
      name: null,
      race: null,
      archetype: {
        range: {
          range_id: 1,
          label: "Melee",
          description: "Disables some ranges, but adds more HP and Power.",
        },
        role: {
          role_id: 2,
          label: "Damage",
          description: "Things need bonk? You bonk.",
        },
      },
      cores: {
        1: {
          id: 1,
          label: "My Best Spell",
          prefix: "Cracked",
          tier: 1,
          sockets: 1,
          range: 2,
          shape: 1,
          type: 1,
          power: 0,
          cost: 0,
          cooldown: 0,
        },
      },
      equipped: {},
    },
    inventory: [],
  }),
  actions: {
    setCharacters(characters) {
      this.characters = characters;
    },
    setCharacter(character) {
      this.character = character;
    },
    setInventory(inventory) {
      this.inventory = inventory;
    },
    async getUser() {
      const response = await api.get("user/refresh");
      this.setCharacter(response.character);
      // some endpoints may include inventory, but ensure cached inventory is set
      if (response.inventory) this.setInventory(response.inventory);
    },
    async ensureInventory(force = false) {
      // Do not re-fetch if we already have inventory unless forced
      if (!force && Array.isArray(this.inventory) && this.inventory.length > 0) return this.inventory;
      try {
        // The server endpoint is /inventory/ (session-backed)
        const response = await api.get('inventory');
        if (response && response.success) {
          // response.containers is the canonical structure
          this.setInventory(response.containers || []);
          return this.inventory;
        }
      } catch (e) {
        console.warn('Failed to fetch inventory', e);
      }
      return this.inventory;
    },
    async getCharacters() {
      const response = await api.get("user/characters");
      this.setCharacters(response.characters);
    },
    async getCharacter() {
      const response = await api.get("user/character");
      this.setCharacter(response.data);
    },
    async getInventory() {
      const response = await api.get("user/inventory");
      this.setInventory(response.data);
    },
    // bootstrap helper to fetch user context at app mount
    async bootstrapOnMount() {
      try {
        // Try to refresh user and active character
        const response = await api.get('user/refresh');
        if (!response || !response.character) {
          // No active character present; force logout
          await api.post('user/logout');
          return null;
        }
        this.setCharacter(response.character);
        // ensure inventory is fetched once and cached
        await this.ensureInventory();
        return response.character;
      } catch (e) {
        // If unauthorized or other error, let the api helper route to login
        console.warn('bootstrap failed', e);
        return null;
      }
    },
    async selectCharacter(characterId) {
      const response = await api.post("user/character/select", { characterId });
      if (response.success) {
        router.push("/");
        this.setCharacter(response.character);
        this.setInventory(response.inventory);
      } else {
        console.log(response.error);
      }
    },
    async logout() {
      const response = await api.post("user/logout");
      if (response.success) router.push("/login");
      else console.log(response.error);
    },
  },
});
