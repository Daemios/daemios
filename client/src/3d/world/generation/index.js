import { createHexGenerator } from "./HexWorldGenerator";
import { createHexGenerator2 } from "./HexWorldGenerator2";

// Registry of available world generator factories keyed by version name
const registry = {
  hex: createHexGenerator,
  "2.0": createHexGenerator2,
};

/**
 * Return a list of available generator version keys.
 */
export function availableWorldGenerators() {
  return Object.keys(registry);
}

/**
 * Create a world generator for a given version and seed.
 * Falls back to the default 'hex' generator when the version is unknown.
 */
export function createWorldGenerator(version = "hex", seed) {
  const factory = registry[version] || registry.hex;
  return factory(seed);
}

/**
 * Allow external registration of additional generator versions at runtime.
 * Useful for experimentation with new algorithms.
 */
export function registerWorldGenerator(version, factory) {
  if (version && typeof factory === "function") registry[version] = factory;
}
