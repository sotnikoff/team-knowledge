import type { SaveStatus as Status } from '../hooks/useAutosave'

const labels: Record<Status, string> = {
  saved: 'Сохранено',
  pending: 'Есть изменения…',
  saving: 'Сохранение…',
  error: 'Ошибка сохранения',
  conflict: 'Доска изменена в другом месте',
}

const dots: Record<Status, string> = {
  saved: 'bg-emerald-500',
  pending: 'bg-amber-400',
  saving: 'bg-amber-400 animate-pulse',
  error: 'bg-red-500',
  conflict: 'bg-red-500',
}

export function SaveStatus(props: { status: Status; onRetry: () => void; onReload: () => void }) {
  return (
    <div className="flex items-center gap-2 px-2 text-sm text-slate-600" role="status">
      <span className={`h-2 w-2 rounded-full ${dots[props.status]}`} />
      {labels[props.status]}
      {props.status === 'error' && (
        <button type="button" className="text-indigo-700 hover:underline" onClick={props.onRetry}>
          Повторить
        </button>
      )}
      {props.status === 'conflict' && (
        <button type="button" className="text-indigo-700 hover:underline" onClick={props.onReload}>
          Загрузить актуальную
        </button>
      )}
    </div>
  )
}
