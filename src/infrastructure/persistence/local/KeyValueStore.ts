/**
 * The subset of the Web Storage API the adapter needs. `window.localStorage`
 * satisfies it directly; tests use `InMemoryKeyValueStore`.
 */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }
}
