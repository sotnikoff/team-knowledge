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
export type EntityKind = 'project' | 'space' | 'board' | 'document'

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

/** Kinds of export files (archives). */
export type ArchiveFileKind = 'project' | 'space' | 'board' | 'document'

/**
 * An imported file cannot be used: it is not an export of this app (or is
 * damaged / from a newer version), or it holds a different level than the
 * place it is imported into.
 */
export class InvalidFileError extends DomainError {
  readonly code = 'INVALID_FILE'
  readonly reason: 'unreadable' | 'wrongKind'
  readonly expected: ArchiveFileKind | null
  readonly actual: ArchiveFileKind | null

  constructor(
    reason: 'unreadable' | 'wrongKind',
    details: { expected?: ArchiveFileKind; actual?: ArchiveFileKind; cause?: unknown } = {},
  ) {
    super(reason === 'unreadable' ? 'Not an export file of this app' : `Expected a ${details.expected} file, got ${details.actual}`, {
      cause: details.cause,
    })
    this.reason = reason
    this.expected = details.expected ?? null
    this.actual = details.actual ?? null
  }
}

/** The email address is malformed. */
export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL'

  constructor() {
    super('Invalid email address')
  }
}

/**
 * The login code cannot be accepted: not six digits (`format`), not the one
 * that was sent (`wrong`), or too old / used up (`expired`).
 */
export class InvalidCodeError extends DomainError {
  readonly code = 'INVALID_CODE'
  readonly reason: 'format' | 'wrong' | 'expired'

  constructor(reason: 'format' | 'wrong' | 'expired') {
    super(`Invalid login code: ${reason}`)
    this.reason = reason
  }
}

/** No valid session: the access token is missing, expired or rejected (HTTP 401). */
export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED'

  constructor(message = 'Not signed in') {
    super(message)
  }
}
