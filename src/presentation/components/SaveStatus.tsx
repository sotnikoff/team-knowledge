import type { SaveStatus as Status } from '../hooks/useAutosave'
import { useI18n, type MessageKey } from '../i18n/i18n'

const labels: Record<Status, MessageKey> = {
  saved: 'save.saved',
  pending: 'save.pending',
  saving: 'save.saving',
  error: 'save.error',
  conflict: 'save.conflict',
}

const dots: Record<Status, string> = {
  saved: 'bg-emerald-500',
  pending: 'bg-amber-400',
  saving: 'bg-amber-400 animate-pulse',
  error: 'bg-red-500',
  conflict: 'bg-red-500',
}

export function SaveStatus(props: { status: Status; onRetry: () => void; onReload: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2 px-2 text-sm text-slate-600" role="status">
      <span className={`h-2 w-2 rounded-full ${dots[props.status]}`} />
      {t(labels[props.status])}
      {props.status === 'error' && (
        <button type="button" className="text-indigo-700 hover:underline" onClick={props.onRetry}>
          {t('common.retry')}
        </button>
      )}
      {props.status === 'conflict' && (
        <button type="button" className="text-indigo-700 hover:underline" onClick={props.onReload}>
          {t('save.reload')}
        </button>
      )}
    </div>
  )
}
