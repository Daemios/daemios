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
      try {
        console.debug('[userStore] setCharacter', character && { id: character.id, equipped: character.equipped });
      } catch (e) {
        /* ignore logging errors */
      }
    },
    // Set both character and inventory atomically to avoid UI flicker during
    // equip operations that update slot and inventory together.
      // Helper to map server Item -> client-friendly shape used by components
      mapItemForClient(it) {
        if (!it) return null;
        return {
          ...it,
          img: it.image || it.img || '/img/debug/placeholder.png',
          label: it.label || it.name || it.displayName || null,
        };
      },
      setInventory(inventory) {
        if (!Array.isArray(inventory)) {
          this.inventory = inventory || [];
          return;
        }
        // Normalize each container and its items so the UI can rely on label/img
        const mapped = inventory.map((c) => {
          const items = Array.isArray(c.items) ? c.items.map((it) => this.mapItemForClient(it)) : [];
          items.sort((a, b) => (Number.isInteger(a && a.containerIndex) ? a.containerIndex : 0) - (Number.isInteger(b && b.containerIndex) ? b.containerIndex : 0));
          return { ...c, items };
        });
        try { console.debug('[userStore] setInventory mapped containers', mapped.map(m=>({id:m.id, capacity:m.capacity, items:m.items.length}))); } catch(e){ /* ignore */ }
        this.inventory = mapped;
      },
      setCharacterAndInventory(character, inventory, options = {}) {
        this.character = character;
        // If server indicates capacityUpdated and provides container ids,
        // replace only those containers wholesale to avoid client-side diffing.
        const capacityUpdated = options.capacityUpdated === true;
        const updatedContainerIds = Array.isArray(options.updatedContainerIds) ? options.updatedContainerIds : [];

        if (Array.isArray(inventory)) {
          if (capacityUpdated) {
            // If any container capacity changed, replace the canonical
            // containers list to ensure the UI reflects new capacities.
            this.setInventory(inventory);
          } else if (updatedContainerIds.length > 0 && Array.isArray(this.inventory)) {
            // Map incoming containers for easy lookup (use string keys to
            // avoid mismatches between number/string ids coming from server)
            const incoming = (inventory || []).map((c) => ({ ...c }));
            const incomingById = new Map();
            incoming.forEach((c) => incomingById.set(String(c.id), c));

            const updatedSet = new Set(updatedContainerIds.map((id) => String(id)));

            // Replace matching containers in-place, preserving order of existing inventory
            const existing = Array.isArray(this.inventory) ? this.inventory.slice() : [];
            const replaced = existing.map((c) => {
              const key = String(c.id);
              if (updatedSet.has(key) && incomingById.has(key)) {
                // normalize the server container before inserting
                const srv = incomingById.get(key);
                const items = Array.isArray(srv.items) ? srv.items.map((it) => this.mapItemForClient(it)) : [];
                items.sort((a, b) => (Number.isInteger(a && a.containerIndex) ? a.containerIndex : 0) - (Number.isInteger(b && b.containerIndex) ? b.containerIndex : 0));
                return { ...srv, items };
              }
              return c;
            });

            // Also add any incoming containers that did not exist locally
            incoming.forEach((c) => {
              const key = String(c.id);
              if (!existing.find((e) => String(e.id) === key)) {
                const items = Array.isArray(c.items) ? c.items.map((it) => this.mapItemForClient(it)) : [];
                items.sort((a, b) => (Number.isInteger(a && a.containerIndex) ? a.containerIndex : 0) - (Number.isInteger(b && b.containerIndex) ? b.containerIndex : 0));
                replaced.push({ ...c, items });
              }
            });

            this.inventory = replaced;
            try { console.debug('[userStore] replaced containers', { updatedContainerIds, replacedCount: replaced.length }); } catch (e) { /* ignore */ }
          } else {
            // No selective replace needed; replace all containers with canonical list
            this.setInventory(inventory);
          }
        } else if (inventory) {
          this.inventory = inventory;
        }

        try {
          console.debug('[userStore] setCharacterAndInventory', { id: character && character.id, inventoryCount: (this.inventory || []).length, capacityUpdated, updatedContainerIds });
        } catch (e) {
          /* ignore logging errors */
        }
      },
    // (normalized setInventory defined above)
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
        console.debug('[userStore] bootstrapOnMount received character', response.character && { id: response.character.id, equipped: response.character.equipped });
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
        // server may return canonical containers under `containers` (new) or
        // `inventory` (legacy). Accept either to remain compatible.
        this.setInventory(response.containers || response.inventory || []);
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
