function normalizeKey(key) {
  if (key === null || typeof key === 'undefined') return 'null';
  if (typeof key === 'string' || typeof key === 'number' || typeof key === 'boolean') return String(key);
  if (Array.isArray(key)) return key.map((part) => normalizeKey(part)).join('|');
  if (typeof key === 'object') {
    if (typeof key.key === 'string') return key.key;
    if (typeof key.toString === 'function' && key.toString !== Object.prototype.toString) return key.toString();
    try {
      return JSON.stringify(key);
    } catch (e) {
      return String(key);
    }
  }
  return String(key);
}

export class TileCache {
  constructor() {
    this._stores = new Map();
  }

  _getStore(name = 'default') {
    const key = name || 'default';
    if (!this._stores.has(key)) this._stores.set(key, new Map());
    return this._stores.get(key);
  }

  get(store, key, factory) {
    const storeMap = this._getStore(store);
    const cacheKey = normalizeKey(key);
    if (storeMap.has(cacheKey)) return storeMap.get(cacheKey);
    const value = typeof factory === 'function' ? factory() : factory;
    storeMap.set(cacheKey, value);
    return value;
  }

  getWarp(key, factory) {
    return this.get('warp', key, factory);
  }

  getVoronoi(key, factory) {
    return this.get('voronoi', key, factory);
  }

  getValue(key, factory) {
    return this.get('values', key, factory);
  }

  has(store, key) {
    return this._getStore(store).has(normalizeKey(key));
  }

  set(store, key, value) {
    this._getStore(store).set(normalizeKey(key), value);
    return value;
  }

  clear(store) {
    if (typeof store === 'string') {
      this._stores.delete(store);
    } else {
      this._stores.clear();
    }
  }

  stores() {
    return Array.from(this._stores.keys());
  }
}

export default { TileCache };
