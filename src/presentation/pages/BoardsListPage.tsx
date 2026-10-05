import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { BOARD_NAME_MAX_LENGTH } from '@/domain/board/Board'
import { BoardCard } from '../components/BoardCard'
import { errorMessage } from '../errors'
import { useBoardList, useCreateBoard } from '../hooks/useBoards'

export function BoardsListPage() {
  const boards = useBoardList()
  const create = useCreateBoard()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(name.trim() || 'Без названия', {
      onSuccess: (board) => void navigate(`/boards/${board.id}`),
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Доски</h1>
          <p className="text-slate-500">Рисуйте диаграммы в стиле от руки</p>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={BOARD_NAME_MAX_LENGTH}
            placeholder="Название новой доски"
            aria-label="Название новой доски"
            className="w-64 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Создать
          </button>
        </form>
      </header>

      {create.error && <p className="mb-4 text-red-600">{errorMessage(create.error)}</p>}

      {boards.isPending ? (
        <p className="text-slate-500">Загрузка…</p>
      ) : boards.error ? (
        <p className="text-red-600">{errorMessage(boards.error)}</p>
      ) : boards.data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
          Пока нет ни одной доски. Создайте первую!
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.data.map((board) => (
            <li key={board.id}>
              <BoardCard board={board} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
