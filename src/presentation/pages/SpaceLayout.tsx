import { Link, Outlet, useParams } from 'react-router'
import { AppIcon } from '../components/icons'
import { LoadError, Loading } from '../components/PageState'
import { SpaceSidebar } from '../components/SpaceSidebar'
import { useSpace } from '../hooks/useSpaces'
import { ThemeToggle } from '../theme/ThemeToggle'
import { useSidebarCollapsed } from './useSidebarCollapsed'
import { useI18n } from '../i18n/i18n'
import { LanguageSelect } from '../i18n/LanguageSelect'

/** A space: sidebar with its boards and documents + the opened item. */
export function SpaceLayout() {
  const { spaceId = '' } = useParams()
  const space = useSpace(spaceId)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const { t } = useI18n()

  if (space.isPending) return <Loading>{t('spaces.loading')}</Loading>
  if (space.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <LoadError error={space.error} onRetry={() => void space.refetch()} />
        <Link to="/" className="text-indigo-700 hover:underline">
          {t('spaces.backToList')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {collapsed ? (
        // Collapsed: a thin rail, so nothing overlaps the board or the document toolbar.
        <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2">
          <SidebarButton label={t('sidebar.show')} onClick={() => setCollapsed(false)} />
          <div className="mt-auto">
            <ThemeToggle />
          </div>
        </aside>
      ) : (
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between pl-3 pr-1 pt-2">
            <Link to="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
              <AppIcon name="back" /> {t('spaces.all')}
            </Link>
            <SidebarButton label={t('sidebar.hide')} onClick={() => setCollapsed(true)} />
          </div>
          <Link
            to={`/spaces/${space.data.id}`}
            className="truncate px-4 pb-2 pt-2 text-lg font-semibold text-slate-900 hover:text-indigo-700"
          >
            {space.data.name}
          </Link>
          <SpaceSidebar spaceId={space.data.id} />
          <div className="border-t border-slate-200 p-2">
            <div className="flex items-center justify-between gap-1">
            <ThemeToggle withLabel />
            <LanguageSelect />
          </div>
          </div>
        </aside>
      )}
      <main className="relative min-w-0 flex-1 overflow-auto bg-canvas">
        <Outlet />
      </main>
    </div>
  )
}

function SidebarButton(props: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      <AppIcon name="sidebar" />
    </button>
  )
}
