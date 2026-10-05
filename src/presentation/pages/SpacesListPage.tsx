import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { ItemCard } from '../components/ItemCard'
import { formatUpdated } from '../format'
import { errorMessage } from '../errors'
import { useCreateSpace, useDeleteSpace, useRenameSpace, useSpaceList } from '../hooks/useSpaces'

export function SpacesListPage() {
  const spaces = useSpaceList()
  const create = useCreateSpace()
  const rename = useRenameSpace()
  const remove = useDeleteSpace()
  const navigate = useNavigate()
  const [name, setName] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    create.mutate(name.trim() || 'Без названия', {
      onSuccess: (space) => void navigate(`/spaces/${space.id}`),
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Зарисовки</h1>
          <p className="text-slate-500">Доски с диаграммами и документы — вместе</p>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Название новой зарисовки"
            aria-label="Название новой зарисовки"
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

      {spaces.isPending ? (
        <p className="text-slate-500">Загрузка…</p>
      ) : spaces.error ? (
        <p className="text-red-600">{errorMessage(spaces.error)}</p>
      ) : spaces.data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
          Пока нет ни одной зарисовки. Создайте первую!
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.data.map((space) => (
            <li key={space.id}>
              <ItemCard
                title={space.name}
                subtitle={formatUpdated(space.updatedAt)}
                to={`/spaces/${space.id}`}
                rename={(newName) => rename.mutateAsync({ id: space.id, name: newName })}
                remove={() => remove.mutateAsync(space.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
