import { defineStore } from "pinia";
import api from "@/utils/api";

export const useAbilityStore = defineStore("ability", {
  state: () => ({
    elements: null,
    ranges: null,
    types: null,
    shapes: null,
  }),
  actions: {
    async getElements() {
      const response = await api.get("ability/elements");
      this.elements = response.data ?? response;
    },
    async getShapes() {
      const response = await api.get("ability/shapes");
      this.shapes = response.data ?? response;
    },
    async getTypes() {
      const response = await api.get("ability/types");
      this.types = response.data ?? response;
    },
    async getRanges() {
      const response = await api.get("ability/ranges");
      this.ranges = response.data ?? response;
    },
    async loadAll() {
      // simple parallel load
      const [els, shapes, types, ranges] = await Promise.all([
        api.get("ability/elements"),
        api.get("ability/shapes"),
        api.get("ability/types"),
        api.get("ability/ranges"),
      ]);
      this.elements = els.data ?? els;
      this.shapes = shapes.data ?? shapes;
      this.types = types.data ?? types;
      this.ranges = ranges.data ?? ranges;
    },
  },
});
