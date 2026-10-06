import type { Clock } from '@/application/ports/Clock'
import type { IdGenerator } from '@/application/ports/IdGenerator'
import {
  NotFoundError,
  StorageUnavailableError,
  VersionConflictError,
  type EntityKind,
} from '@/domain/shared/errors'
import type { Draft, Versioned } from '@/domain/shared/versioned'
import type { KeyValueStore } from './KeyValueStore'

/** How one entity type is (de)serialized. Built from the shared DTO mappers. */
export interface CollectionCodec<TFull extends Versioned, TSummary> {
  readonly entity: EntityKind
  toDto(entity: TFull): unknown
  fromDto(raw: unknown): TFull
  /** The listing entry (no heavy content) stored in the index. */
  toIndexEntry(entity: TFull): unknown
  summaryFromDto(raw: unknown): TSummary
}

/**
 * How this adapter gives new entities their identity. It is a detail of the
 * localStorage adapter only: with a real backend the server assigns ids and
 * timestamps on POST and the client never generates them.
 */
export interface LocalIdentity {
  readonly ids: IdGenerator
  readonly clock: Clock
}

export interface CollectionKeys {
  readonly index: string
  item(id: string): string
}

/**
 * A collection stored the way the REST API exposes it: an index of summaries
 * (`GET /things`) plus one JSON document per entity (`GET /things/:id`).
 * Implements the shared repository semantics (versions, errors, detached
 * copies); repositories are thin async wrappers around it.
 */
export class LocalCollection<TFull extends Versioned, TSummary> {
  private readonly store: KeyValueStore
  private readonly keys: CollectionKeys
  private readonly codec: CollectionCodec<TFull, TSummary>
  private readonly identity: LocalIdentity

  constructor(
    store: KeyValueStore,
    keys: CollectionKeys,
    codec: CollectionCodec<TFull, TSummary>,
    identity: LocalIdentity,
  ) {
    this.identity = identity
    this.store = store
    this.keys = keys
    this.codec = codec
  }

  list(): TSummary[] {
    return this.parse(() => this.readIndex().map((entry) => this.codec.summaryFromDto(entry)))
  }

  get(id: string): TFull {
    const raw = this.read(this.keys.item(id))
    if (raw === null) throw new NotFoundError(this.codec.entity, id)
    return this.parse(() => this.codec.fromDto(raw))
  }

  /** Plays the server's part of `POST`: assigns id, first version and timestamps. */
  create(draft: Draft<TFull>): TFull {
    const now = this.identity.clock.now()
    const entity = { ...draft, id: this.identity.ids.next(), version: 1, createdAt: now, updatedAt: now } as TFull
    // A UUID collision is practically impossible; never overwrite silently.
    if (this.exists(entity.id)) throw new StorageUnavailableError(`Generated id "${entity.id}" is already taken`)
    this.write(entity)
    return this.get(entity.id)
  }

  save(entity: TFull): TFull {
    const stored = this.get(entity.id)
    if (stored.version !== entity.version) throw new VersionConflictError(this.codec.entity, entity.id)
    this.write({ ...entity, version: stored.version + 1 })
    return this.get(entity.id)
  }

  delete(id: string): void {
    if (!this.exists(id)) throw new NotFoundError(this.codec.entity, id)
    this.deleteMany([id])
  }

  /** Removes several entities at once, ignoring unknown ids. */
  deleteMany(ids: readonly string[]): void {
    const removed = new Set(ids)
    this.guard(() => {
      for (const id of ids) this.store.removeItem(this.keys.item(id))
      this.writeIndex(this.readIndex().filter((entry) => !removed.has(entryId(entry) ?? '')))
    })
  }

  // ---------- internals ----------

  private exists(id: string): boolean {
    return this.read(this.keys.item(id)) !== null
  }

  private write(entity: TFull): void {
    const entry = this.codec.toIndexEntry(entity)
    const index = this.readIndex().filter((e) => entryId(e) !== entity.id)
    this.guard(() => {
      this.store.setItem(this.keys.item(entity.id), JSON.stringify(this.codec.toDto(entity)))
      this.writeIndex([...index, entry])
    })
  }

  private readIndex(): unknown[] {
    const raw = this.read(this.keys.index)
    if (raw === null) return []
    if (!Array.isArray(raw)) throw new StorageUnavailableError(`Index "${this.keys.index}" is corrupted`)
    return raw
  }

  private writeIndex(index: unknown[]): void {
    this.store.setItem(this.keys.index, JSON.stringify(index))
  }

  /** Reads and JSON-parses a key; `null` if absent. */
  private read(key: string): unknown {
    const text = this.guard(() => this.store.getItem(key))
    if (text === null) return null
    return this.parse(() => JSON.parse(text) as unknown)
  }

  /** Translates storage failures (quota, disabled storage) into a domain error. */
  private guard<T>(action: () => T): T {
    try {
      return action()
    } catch (error) {
      throw new StorageUnavailableError('Local storage is unavailable', { cause: error })
    }
  }

  /** Translates malformed data into a domain error. */
  private parse<T>(action: () => T): T {
    try {
      return action()
    } catch (error) {
      if (error instanceof StorageUnavailableError) throw error
      throw new StorageUnavailableError('Stored data is corrupted', { cause: error })
    }
  }
}

function entryId(entry: unknown): string | undefined {
  const id = typeof entry === 'object' && entry !== null ? (entry as { id?: unknown }).id : undefined
  return typeof id === 'string' ? id : undefined
}
