import type { ReactNode } from 'react'
import { NotFoundError } from '@/domain/shared/errors'
import { errorMessage } from '../errors'
import { useI18n } from '../i18n/i18n'

export function Loading({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-64 items-center justify-center text-slate-500">{children}</div>
}

/** Error state for a page: retry unless the thing simply does not exist. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-slate-600">
      <p>{errorMessage(error, t)}</p>
      {!(error instanceof NotFoundError) && (
        <button type="button" className="text-indigo-700 hover:underline" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}
