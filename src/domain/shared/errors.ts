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

export class BoardNotFoundError extends DomainError {
  readonly code = 'BOARD_NOT_FOUND'
  readonly boardId: string

  constructor(boardId: string) {
    super(`Board "${boardId}" not found`)
    this.boardId = boardId
  }
}

export class BoardAlreadyExistsError extends DomainError {
  readonly code = 'BOARD_ALREADY_EXISTS'
  readonly boardId: string

  constructor(boardId: string) {
    super(`Board "${boardId}" already exists`)
    this.boardId = boardId
  }
}

/** Optimistic-concurrency failure: somebody saved a newer version first. */
export class BoardConflictError extends DomainError {
  readonly code = 'BOARD_CONFLICT'
  readonly boardId: string

  constructor(boardId: string) {
    super(`Board "${boardId}" was modified elsewhere`)
    this.boardId = boardId
  }
}

export class InvalidBoardNameError extends DomainError {
  readonly code = 'INVALID_BOARD_NAME'

  constructor(reason: string) {
    super(`Invalid board name: ${reason}`)
  }
}

/** The storage backend is unreachable, full, or returned garbage. */
export class StorageUnavailableError extends DomainError {
  readonly code = 'STORAGE_UNAVAILABLE'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}
