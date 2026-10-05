/**
 * Domain errors. Adapters translate their own failures (HTTP status codes,
 * QuotaExceededError, malformed JSON...) into these classes, so the UI only
 * ever has to understand this vocabulary.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

/** Kinds of persisted entities, used to tell errors apart. */
export type EntityKind = 'space' | 'board' | 'document'

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
  readonly entity: EntityKind
  readonly id: string

  constructor(entity: EntityKind, id: string) {
    super(`${entity} "${id}" not found`)
    this.entity = entity
    this.id = id
  }
}

export class AlreadyExistsError extends DomainError {
  readonly code = 'ALREADY_EXISTS'
  readonly entity: EntityKind
  readonly id: string

  constructor(entity: EntityKind, id: string) {
    super(`${entity} "${id}" already exists`)
    this.entity = entity
    this.id = id
  }
}

/** Optimistic-concurrency failure: somebody saved a newer version first. */
export class VersionConflictError extends DomainError {
  readonly code = 'VERSION_CONFLICT'
  readonly entity: EntityKind
  readonly id: string

  constructor(entity: EntityKind, id: string) {
    super(`${entity} "${id}" was modified elsewhere`)
    this.entity = entity
    this.id = id
  }
}

export class InvalidNameError extends DomainError {
  readonly code = 'INVALID_NAME'

  constructor(reason: string) {
    super(`Invalid name: ${reason}`)
  }
}

/** The storage backend is unreachable, full, or returned garbage. */
export class StorageUnavailableError extends DomainError {
  readonly code = 'STORAGE_UNAVAILABLE'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}
