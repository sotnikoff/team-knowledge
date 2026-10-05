import { Link, Outlet, useParams } from 'react-router'
import { AppIcon } from '../components/icons'
import { LoadError, Loading } from '../components/PageState'
import { SpaceSidebar } from '../components/SpaceSidebar'
import { useSpace } from '../hooks/useSpaces'

/** A space: sidebar with its boards and documents + the opened item. */
export function SpaceLayout() {
  const { spaceId = '' } = useParams()
  const space = useSpace(spaceId)

  if (space.isPending) return <Loading>Загрузка зарисовки…</Loading>
  if (space.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <LoadError error={space.error} onRetry={() => void space.refetch()} />
        <Link to="/" className="text-indigo-600 hover:underline">
          К списку зарисовок
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <Link
          to="/"
          className="flex items-center gap-1 px-3 pt-3 text-sm text-slate-500 hover:text-slate-800"
        >
          <AppIcon name="back" /> Все зарисовки
        </Link>
        <Link
          to={`/spaces/${space.data.id}`}
          className="truncate px-4 pb-2 pt-2 text-lg font-semibold text-slate-900 hover:text-indigo-600"
        >
          {space.data.name}
        </Link>
        <SpaceSidebar spaceId={space.data.id} />
      </aside>
      <main className="relative min-w-0 flex-1 overflow-auto bg-white">
        <Outlet />
      </main>
    </div>
  )
}
