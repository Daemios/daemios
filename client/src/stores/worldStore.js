import { defineStore } from "pinia";
import api from "@/utils/api";
import { populateEntities } from "@/3d2/domain/world/generator";

// Central world store: terrain, locations, and future world entities
// Location model:
// {
//   chunkX, chunkY, hexQ, hexR, type, name, description, visibility, owner, specialization
// }
export const useWorldStore = defineStore("world", {
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
        const res = await api.get("world/seed");
        const payload = (res && res.data) || {};
        this.worldSeed = payload?.seed ?? null;
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
        const res = await api.get("world/locations");
        const payload = (res && res.data) || {};
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.locations)
          ? payload.locations
          : [];
        this.locations = list;
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
        await api.post("world/locations", payload ?? {});
        // Refresh after creating
        await this.fetchLocations();
      } catch (e) {
        this.lastError = e?.message || String(e);
        throw e;
      }
    },
    // Import generated entities from the deterministic generator and persist them
    // into the locations store. This is a conservative implementation that
    // creates locations one-by-one using the existing API to avoid assuming a
    // batch import endpoint on the server.
    async importLocationsFromGenerator(seed = 'demo-seed', radius = 6) {
      try {
        this.lastError = null;
        const entities = populateEntities(seed, radius);
        if (!Array.isArray(entities)) return;
        for (const e of entities) {
          // Map domain entity to server location shape minimally
          const payload = {
            hexQ: e.pos.q,
            hexR: e.pos.r,
            type: e.type,
            name: e.data?.name ?? `${e.type}-${e.id}`,
            description: e.data ?? {},
          };
          // Use createLocation (which refreshes locations after each create)
          await this.createLocation(payload);
        }
      } catch (err) {
        this.lastError = err?.message || String(err);
        throw err;
      }
    },
    // Attempt a batched import by posting multiple locations in one request.
    // Falls back to the per-entity createLocation method if the server
    // doesn't support batch imports or the request fails.
    async importLocationsBatch(seed = 'demo-seed', radius = 6) {
      try {
        this.lastError = null;
        const entities = populateEntities(seed, radius);
        if (!Array.isArray(entities) || !entities.length) return;
        const payloads = entities.map((e) => ({
          hexQ: e.pos.q,
          hexR: e.pos.r,
          type: e.type,
          name: e.data?.name ?? `${e.type}-${e.id}`,
          description: e.data ?? {},
        }));

        // Try batch endpoint first
        try {
          await api.post('world/locations/batch', { locations: payloads });
          // refresh after batch
          await this.fetchLocations();
          return;
        } catch (err) {
          // if batch endpoint not available or failed, fall back
          // to sequential creates
          // Continue to fallback below
        }

        for (const p of payloads) {
          await this.createLocation(p);
        }
      } catch (err) {
        this.lastError = err?.message || String(err);
        throw err;
      }
    },
  },
});
