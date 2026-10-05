import { DomainError, StorageUnavailableError } from '@/domain/shared/errors'

const messages: Record<string, string> = {
  BOARD_NOT_FOUND: 'Доска не найдена',
  BOARD_ALREADY_EXISTS: 'Доска с таким id уже существует',
  BOARD_CONFLICT: 'Доска была изменена в другом месте',
  INVALID_BOARD_NAME: 'Некорректное название доски',
  STORAGE_UNAVAILABLE: 'Хранилище недоступно',
}

export function errorMessage(error: unknown): string {
  if (error instanceof DomainError) return messages[error.code] ?? error.message
  return 'Что-то пошло не так'
}

/** Only infrastructure hiccups are worth retrying; domain errors are final. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof DomainError) || error instanceof StorageUnavailableError
}
