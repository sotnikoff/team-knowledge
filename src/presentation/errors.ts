import {
  DomainError,
  InvalidFileError,
  NotFoundError,
  StorageUnavailableError,
  VersionConflictError,
  type EntityKind,
} from '@/domain/shared/errors'
import type { MessageKey, Translate } from './i18n/i18n'

const notFound: Record<EntityKind, MessageKey> = {
  project: 'errors.notFound.project',
  space: 'errors.notFound.space',
  board: 'errors.notFound.board',
  document: 'errors.notFound.document',
}

const byCode: Record<string, MessageKey> = {
  INVALID_NAME: 'errors.invalidName',
  STORAGE_UNAVAILABLE: 'errors.storage',
}

/** Domain error -> text in the UI language (`t` from `useI18n()`). */
export function errorMessage(error: unknown, t: Translate): string {
  if (error instanceof NotFoundError) return t(notFound[error.entity])
  if (error instanceof VersionConflictError) return t('errors.conflict')
  if (error instanceof InvalidFileError) {
    return error.reason === 'wrongKind' && error.expected && error.actual
      ? t('errors.wrongFileKind', { expected: t(`archive.kind.${error.expected}`), actual: t(`archive.kind.${error.actual}`) })
      : t('errors.invalidFile')
  }
  if (error instanceof DomainError) {
    const key = byCode[error.code]
    return key ? t(key) : error.message
  }
  return t('errors.unknown')
}

/** Only infrastructure hiccups are worth retrying; domain errors are final. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof DomainError) || error instanceof StorageUnavailableError
}
