import * as SimplexNoiseModule from 'simplex-noise';

const SimplexNoise = (SimplexNoiseModule && SimplexNoiseModule.default) || SimplexNoiseModule;

export const CORE_FIELDS = ['macro', 'warpSlow', 'warpFast', 'plateVoronoi', 'mediumDetail'];
export const LEGACY_ATTRIBUTES = ['elevation', 'moisture', 'flora', 'passable', 'territory'];

const LEGACY_DEFAULT_SCALE = 0.05;
const registryCache = new Map();

function pickNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function defaultToUnit(value) {
  return (value + 1) * 0.5;
}

function createSimplexFactory(name) {
  return ({ seed }) => new SimplexNoise(`${seed}:${name}`);
}

function createDefaultFieldMap(names) {
  const entries = {};
  for (const name of names) {
    entries[name] = { factory: createSimplexFactory(name) };
  }
  return entries;
}

function wrapNoise(source, name) {
  if (!source) throw new Error(`Noise source "${name}" is undefined.`);
  if (typeof source === 'function') return { noise2D: source };
  if (typeof source.noise2D === 'function') return source;
  throw new Error(`Noise factory for "${name}" must return an object with a noise2D function.`);
}

function normalizeField(name, entry = {}) {
  if (entry === null || typeof entry === 'undefined') entry = {};
  if (typeof entry === 'string') return { alias: entry };
  if (typeof entry.alias === 'string') {
    const norm = { alias: entry.alias };
    if (entry.metadata && typeof entry.metadata === 'object') norm.metadata = { ...entry.metadata };
    return norm;
  }

  let instance = null;
  if (typeof entry.noise2D === 'function') instance = entry;
  else if (entry.instance && typeof entry.instance.noise2D === 'function') instance = entry.instance;
  else if (entry.source && typeof entry.source.noise2D === 'function') instance = entry.source;
  else if (entry.noise && typeof entry.noise.noise2D === 'function') instance = entry.noise;

  let factory = null;
  if (typeof entry.factory === 'function') factory = entry.factory;
  else if (typeof entry === 'function') factory = entry;
  else if (instance) factory = () => instance;
  if (!factory) factory = createSimplexFactory(name);

  const scale = pickNumber(entry.scale);
  const transform = typeof entry.transform === 'function' ? entry.transform : undefined;
  const toUnit = typeof entry.toUnit === 'function' ? entry.toUnit : undefined;
  const metadata = entry && entry.metadata ? { ...entry.metadata } : {};
  const aliases = Array.isArray(entry.aliases) ? entry.aliases.slice() : [];

  return { factory, instance, scale, transform, toUnit, metadata, aliases };
}

export class NoiseSource {
  constructor(name, config, registry) {
    this.name = name;
    this.registry = registry;
    this.config = config || {};
    this.metadata = { ...(this.config.metadata || {}) };
    const raw = this.config.factory({ seed: registry.seed, name, registry });
    this.noise = wrapNoise(raw, name);
    this.noise2D = this.noise.noise2D.bind(this.noise);
  }

  sampleRaw(x, y, options = {}) {
    const scale = pickNumber(options.scale, this.config.scale, this.registry.defaultScale, 1) ?? 1;
    const sx = x * scale;
    const sy = y * scale;
    const value = this.noise2D(sx, sy);
    const transform = options.transform ?? this.config.transform;
    if (typeof transform === 'function') return transform(value, { x: sx, y: sy, source: this, registry: this.registry, options });
    return value;
  }

  sample01(x, y, options = {}) {
    const raw = this.sampleRaw(x, y, options);
    const mapper = options.toUnit ?? this.config.toUnit ?? this.registry.defaultToUnit ?? defaultToUnit;
    if (typeof mapper === 'function') return mapper(raw, { source: this, registry: this.registry, options });
    return defaultToUnit(raw);
  }
}

export class NoiseRegistry {
  constructor(seed, options = {}) {
    this.seed = String(seed ?? '');
    this._fields = new Map();
    this._aliases = new Map();
    this._cache = new Map();
    this.defaultScale = pickNumber(options.defaultScale, 1) ?? 1;
    this.defaultToUnit = typeof options.defaultToUnit === 'function' ? options.defaultToUnit : defaultToUnit;
    this.legacyAttributes = Array.isArray(options.legacyAttributes) && options.legacyAttributes.length
      ? options.legacyAttributes.slice()
      : LEGACY_ATTRIBUTES.slice();
    this.coreFields = Array.isArray(options.coreFields) && options.coreFields.length
      ? options.coreFields.slice()
      : CORE_FIELDS.slice();

    this.defineMany(createDefaultFieldMap([...this.coreFields, ...this.legacyAttributes]));
    this.configure(options);
  }

  configure(options = {}) {
    if (!options) return this;
    if (options.fields) this.defineMany(options.fields);
    if (options.aliases) {
      for (const [alias, target] of Object.entries(options.aliases)) this.alias(alias, target);
    }
    if (Array.isArray(options.ensure)) options.ensure.forEach((name) => this.ensure(name));
    if (Array.isArray(options.preload)) options.preload.forEach((name) => { this.getSource(name); });
    return this;
  }

  defineMany(entries) {
    if (!entries) return this;
    if (Array.isArray(entries)) {
      entries.forEach((entry) => {
        if (entry && typeof entry === 'object' && typeof entry.name === 'string') this.define(entry.name, entry);
      });
      return this;
    }
    for (const [name, entry] of Object.entries(entries)) this.define(name, entry);
    return this;
  }

  define(name, entry) {
    if (!name && name !== 0) return this;
    const normalized = normalizeField(String(name), entry || {});
    if (normalized.alias) {
      this.alias(name, normalized.alias);
      return this;
    }
    this._fields.set(String(name), normalized);
    if (Array.isArray(normalized.aliases)) normalized.aliases.forEach((alias) => this.alias(alias, name));
    this._cache.delete(String(name));
    return this;
  }

  ensure(name, entry) {
    const key = String(name);
    if (this._fields.has(key) || this._aliases.has(key)) return this;
    return this.define(key, entry || {});
  }

  alias(aliasName, targetName) {
    if (!aliasName && aliasName !== 0) return this;
    if (!targetName && targetName !== 0) return this;
    const aliasKey = String(aliasName);
    const targetKey = String(targetName);
    if (aliasKey === targetKey) return this;
    this._aliases.set(aliasKey, targetKey);
    this._cache.delete(aliasKey);
    return this;
  }

  _resolveName(name) {
    let current = String(name);
    const visited = new Set();
    while (this._aliases.has(current) && !visited.has(current)) {
      visited.add(current);
      current = this._aliases.get(current);
    }
    return current;
  }

  has(name) {
    const key = this._resolveName(name);
    return this._fields.has(key);
  }

  getField(name) {
    const key = this._resolveName(name);
    return this._fields.get(key);
  }

  getSource(name, fallback) {
    const key = this._resolveName(name);
    if (this._cache.has(key)) return this._cache.get(key);
    let definition = this._fields.get(key);
    if (!definition && fallback) {
      definition = normalizeField(key, fallback);
      this._fields.set(key, definition);
    }
    if (!definition) {
      definition = normalizeField(key, {});
      this._fields.set(key, definition);
    }
    const source = new NoiseSource(key, definition, this);
    this._cache.set(key, source);
    if (key !== name) this._cache.set(String(name), source);
    return source;
  }

  get(name, fallback) {
    return this.getSource(name, fallback);
  }

  clearCache(name) {
    if (typeof name === 'string' || typeof name === 'number') {
      this._cache.delete(this._resolveName(name));
      this._cache.delete(String(name));
    } else {
      this._cache.clear();
    }
    return this;
  }

  sample(name, x, y, options = {}) {
    return this.getSource(name).sampleRaw(x, y, options);
  }

  sample01(name, x, y, options = {}) {
    return this.getSource(name).sample01(x, y, options);
  }

  sampleSet(names, x, y, options = {}) {
    if (!Array.isArray(names)) return {};
    const raw = options.raw === true;
    const sampleOpts = { ...options };
    delete sampleOpts.raw;
    const values = {};
    for (const name of names) {
      values[name] = raw ? this.sample(name, x, y, sampleOpts) : this.sample01(name, x, y, sampleOpts);
    }
    return values;
  }

  sampleLegacy(x, y, options = {}) {
    const names = Array.isArray(options.names) && options.names.length ? options.names : this.legacyAttributes;
    const scale = pickNumber(options.scale, LEGACY_DEFAULT_SCALE) ?? LEGACY_DEFAULT_SCALE;
    const raw = options.raw === true;
    const sampleOpts = { ...options };
    delete sampleOpts.names;
    delete sampleOpts.scale;
    delete sampleOpts.raw;
    const px = x * scale;
    const py = y * scale;
    const result = {};
    for (const name of names) {
      result[name] = raw
        ? this.sample(name, px, py, sampleOpts)
        : this.sample01(name, px, py, sampleOpts);
    }
    return result;
  }

  names() {
    const keys = new Set();
    for (const key of this._fields.keys()) keys.add(key);
    for (const key of this._aliases.keys()) keys.add(key);
    return Array.from(keys);
  }
}

const proxyHandler = {
  get(target, prop, receiver) {
    if (prop === '__registry__') return target;
    if (prop === Symbol.toStringTag) return 'NoiseRegistry';
    if (typeof prop === 'string' && !Reflect.has(target, prop)) {
      return target.get(prop);
    }
    return Reflect.get(target, prop, receiver);
  },
  has(target, prop) {
    if (typeof prop === 'string' && !Reflect.has(target, prop)) return target.has(prop);
    return Reflect.has(target, prop);
  },
  ownKeys(target) {
    const keys = new Set(Reflect.ownKeys(target));
    target.names().forEach((name) => keys.add(name));
    return Array.from(keys);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Reflect.has(target, prop)) return Object.getOwnPropertyDescriptor(target, prop);
    if (typeof prop === 'string' && target.has(prop)) {
      return { configurable: true, enumerable: true, value: target.get(prop), writable: false };
    }
    return undefined;
  }
};

function createRegistry(seed, options = {}) {
  const registry = new NoiseRegistry(seed, options);
  return new Proxy(registry, proxyHandler);
}

export function initNoise(seed = '', options = {}) {
  const key = String(seed ?? '');
  let proxy = registryCache.get(key);
  if (!proxy) {
    proxy = createRegistry(key, options);
    registryCache.set(key, proxy);
  } else if (options && typeof options === 'object' && options !== null) {
    const registry = proxy.__registry__ || proxy;
    if (registry && typeof registry.configure === 'function') registry.configure(options);
  }
  return proxy;
}

export function sampleNoise(noises, x, y, options = {}) {
  if (!noises) return {};
  if (typeof noises.sampleLegacy === 'function') return noises.sampleLegacy(x, y, options);
  const scale = pickNumber(options.scale, LEGACY_DEFAULT_SCALE) ?? LEGACY_DEFAULT_SCALE;
  const names = Array.isArray(options.names) && options.names.length ? options.names : LEGACY_ATTRIBUTES;
  const px = x * scale;
  const py = y * scale;
  const result = {};
  for (const name of names) {
    const source = noises[name];
    if (source && typeof source.sample01 === 'function') {
      result[name] = source.sample01(px, py, options);
    } else if (source && typeof source.noise2D === 'function') {
      const raw = source.noise2D(px, py);
      result[name] = defaultToUnit(raw);
    } else {
      result[name] = 0.5;
    }
  }
  return result;
}

export default { initNoise, sampleNoise, NoiseRegistry, NoiseSource, CORE_FIELDS, LEGACY_ATTRIBUTES };
