import { createHexGenerator2 } from './HexWorldGenerator2';

// Registry of available world generator factories keyed by version name
// Default registry contains the 2.0 generator but callers may register
// additional versions for experimentation.  Profile switching is preserved by
// keeping this registry mechanism.
const registry = {
  '2.0': createHexGenerator2,
};

/**
 * Return a list of available generator version keys.
 */
export function availableWorldGenerators() {
  return Object.keys(registry);
}

/**
 * Create a world generator for a given version and seed.
 * Falls back to the default '2.0' generator when the version is unknown.
 */
export function createWorldGenerator(version = '2.0', seed) {
  const factory = registry[version] || registry['2.0'];
  return factory(seed);
}

/**
 * Allow external registration of additional generator versions at runtime.
 * Useful for experimentation with new algorithms.
 */
export function registerWorldGenerator(version, factory) {
  if (version && typeof factory === 'function') registry[version] = factory;
}
