/**
 * Common shape of every persisted entity. `version` is the
 * optimistic-concurrency token: the value a client read must match the stored
 * one for a save to succeed; every successful save increments it.
 */
export interface Versioned {
  readonly id: string
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * An entity that does not exist yet: everything but its identity. The id, the
 * first version and the timestamps are assigned by the storage that creates it
 * (`Repository.create(draft)`) — a real backend does it on `POST`.
 */
export type Draft<T extends Versioned> = Omit<T, keyof Versioned>
