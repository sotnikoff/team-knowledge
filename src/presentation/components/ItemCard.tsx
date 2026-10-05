import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { errorMessage } from '../errors'

/** Card for a space, board or document: open, rename inline, delete with confirmation. */
export function ItemCard(props: {
  title: string
  subtitle: string
  to: string
  icon?: ReactNode
  rename: (name: string) => Promise<unknown>
  remove: () => Promise<unknown>
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(props.title)
  const [error, setError] = useState<unknown>(null)

  const run = (action: () => Promise<unknown>, after?: () => void) => {
    setError(null)
    action().then(after, setError)
  }

  const onRename = (e: FormEvent) => {
    e.preventDefault()
    run(() => props.rename(name), () => setEditing(false))
  }

  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {editing ? (
        <form onSubmit={onRename} className="flex gap-2">
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            aria-label="Новое название"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-indigo-500"
          />
          <button type="submit" className="text-sm text-indigo-600 hover:underline">
            OK
          </button>
        </form>
      ) : (
        <Link to={props.to} className="group flex gap-3">
          {props.icon && <span className="mt-0.5 text-slate-400 group-hover:text-indigo-500">{props.icon}</span>}
          <span className="min-w-0">
            <h3 className="truncate text-lg font-medium text-slate-900 group-hover:text-indigo-600">{props.title}</h3>
            <p className="text-sm text-slate-500">{props.subtitle}</p>
          </span>
        </Link>
      )}

      {error !== null && <p className="text-sm text-red-600">{errorMessage(error)}</p>}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link to={props.to} className="text-indigo-600 hover:underline">
          Открыть
        </Link>
        <button
          type="button"
          className="text-slate-600 hover:underline"
          onClick={() => {
            setName(props.title)
            setEditing(true)
          }}
        >
          Переименовать
        </button>
        {confirmDelete ? (
          <span className="ml-auto flex gap-2">
            <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => run(props.remove)}>
              Удалить?
            </button>
            <button type="button" className="text-slate-500 hover:underline" onClick={() => setConfirmDelete(false)}>
              Отмена
            </button>
          </span>
        ) : (
          <button type="button" className="ml-auto text-red-600 hover:underline" onClick={() => setConfirmDelete(true)}>
            Удалить
          </button>
        )}
      </div>
    </article>
  )
}
