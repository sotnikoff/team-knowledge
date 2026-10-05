import {
  DomainError,
  NotFoundError,
  StorageUnavailableError,
  VersionConflictError,
  type EntityKind,
} from '@/domain/shared/errors'

const notFound: Record<EntityKind, string> = {
  space: 'Зарисовка не найдена',
  board: 'Доска не найдена',
  document: 'Документ не найден',
}

const messages: Record<string, string> = {
  ALREADY_EXISTS: 'Такой объект уже существует',
  INVALID_NAME: 'Некорректное название',
  STORAGE_UNAVAILABLE: 'Хранилище недоступно',
}

export function errorMessage(error: unknown): string {
  if (error instanceof NotFoundError) return notFound[error.entity]
  if (error instanceof VersionConflictError) return 'Изменено в другом месте — обновите страницу'
  if (error instanceof DomainError) return messages[error.code] ?? error.message
  return 'Что-то пошло не так'
}

/** Only infrastructure hiccups are worth retrying; domain errors are final. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof DomainError) || error instanceof StorageUnavailableError
}
