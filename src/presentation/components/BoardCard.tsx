import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { BOARD_NAME_MAX_LENGTH, type BoardSummary } from '@/domain/board/Board'
import { errorMessage } from '../errors'
import { useDeleteBoard, useRenameBoard } from '../hooks/useBoards'

const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

export function BoardCard({ board }: { board: BoardSummary }) {
  const rename = useRenameBoard()
  const remove = useDeleteBoard()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(board.name)

  const onRename = (e: FormEvent) => {
    e.preventDefault()
    rename.mutate({ id: board.id, name }, { onSuccess: () => setEditing(false) })
  }

  const error = rename.error ?? remove.error

  return (
    <article className="flex h-full flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {editing ? (
        <form onSubmit={onRename} className="flex gap-2">
          <input
            autoFocus
            value={name}
            maxLength={BOARD_NAME_MAX_LENGTH}
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
        <Link to={`/boards/${board.id}`} className="group">
          <h2 className="truncate text-lg font-medium text-slate-900 group-hover:text-indigo-600">{board.name}</h2>
          <p className="text-sm text-slate-500">Изменена {dateFormat.format(board.updatedAt)}</p>
        </Link>
      )}

      {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}

      <div className="flex gap-3 text-sm">
        <Link to={`/boards/${board.id}`} className="text-indigo-600 hover:underline">
          Открыть
        </Link>
        <button
          type="button"
          className="text-slate-600 hover:underline"
          onClick={() => {
            setName(board.name)
            setEditing(true)
          }}
        >
          Переименовать
        </button>
        {confirmDelete ? (
          <span className="ml-auto flex gap-2">
            <button type="button" className="font-medium text-red-600 hover:underline" onClick={() => remove.mutate(board.id)}>
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
