export class AssetStore {
  private cache = new Map<string, { ref: number; value: any }>()

  async load<T>(key: string, loader: (key: string) => Promise<T>): Promise<T> {
    const existing = this.cache.get(key)
    if (existing) {
      existing.ref++
      return existing.value as T
    }
    const value = await loader(key)
    this.cache.set(key, { ref: 1, value })
    return value
  }

  release(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return
    entry.ref--
    if (entry.ref <= 0) {
      ;(entry.value as any)?.dispose?.()
      this.cache.delete(key)
    }
  }

  clear() {
    for (const [, entry] of this.cache) {
      ;(entry.value as any)?.dispose?.()
    }
    this.cache.clear()
  }
}
