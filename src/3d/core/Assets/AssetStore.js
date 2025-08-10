export default class AssetStore {
  constructor() {
    this.cache = new Map();
  }

  async load(key, loader) {
    const cached = this.cache.get(key);
    if (cached) {
      cached.ref += 1;
      return cached.asset;
    }
    const asset = await loader();
    this.cache.set(key, { asset, ref: 1 });
    return asset;
  }

  release(key) {
    const entry = this.cache.get(key);
    if (!entry) return;
    entry.ref -= 1;
    if (entry.ref <= 0) {
      if (entry.asset.dispose) entry.asset.dispose();
      this.cache.delete(key);
    }
  }

  purge() {
    [...this.cache.keys()].forEach((k) => this.release(k));
  }
}
