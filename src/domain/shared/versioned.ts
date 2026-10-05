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
