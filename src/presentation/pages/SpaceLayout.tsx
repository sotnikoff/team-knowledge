import { Link, Outlet, useParams } from 'react-router'
import { UserPanel } from '../auth/UserPanel'
import { AppIcon } from '../components/icons'
import { ErrorPage, Loading } from '../components/PageState'
import { SpaceSidebar } from '../components/SpaceSidebar'
import { useProject } from '../hooks/useProjects'
import { useSpace } from '../hooks/useSpaces'
import { ThemeToggle } from '../theme/ThemeToggle'
import { useSidebarCollapsed } from './useSidebarCollapsed'
import { useI18n } from '../i18n/i18n'
import { IconButton } from '../ui/IconButton'
import styles from './SpaceLayout.module.css'
import { LanguageSelect } from '../i18n/LanguageSelect'

/** A space: sidebar with its boards and documents + the opened item. */
export function SpaceLayout() {
  const { spaceId = '' } = useParams()
  const space = useSpace(spaceId)
  const project = useProject(space.data?.projectId)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  const { t } = useI18n()

  if (space.isPending) return <Loading>{t('spaces.loading')}</Loading>
  if (space.error) {
    return (
      <ErrorPage
        error={space.error}
        onRetry={() => void space.refetch()}
        backTo="/"
        backLabel={t('projects.backToList')}
      />
    )
  }

  return (
    <div className={styles.layout}>
      {collapsed ? (
        // Collapsed: a thin rail, so nothing overlaps the board or the document toolbar.
        <aside className={styles.rail}>
          <IconButton label={t('sidebar.show')} onClick={() => setCollapsed(false)}>
            <AppIcon name="sidebar" />
          </IconButton>
          <div className={styles.railBottom}>
            <ThemeToggle />
            <UserPanel variant="icon" />
          </div>
        </aside>
      ) : (
        <aside className={styles.sidebar}>
          <div className={styles.top}>
            {/* Up to the project of this space. */}
            <Link to={`/projects/${space.data.projectId}`} className={styles.back} title={project.data?.name}>
              <AppIcon name="back" /> <span className={styles.backLabel}>{project.data?.name ?? t('projects.loading')}</span>
            </Link>
            <IconButton label={t('sidebar.hide')} size="sm" onClick={() => setCollapsed(true)}>
              <AppIcon name="sidebar" />
            </IconButton>
          </div>
          <Link to={`/spaces/${space.data.id}`} className={styles.spaceName} title={space.data.name}>
            {space.data.name}
          </Link>
          <SpaceSidebar spaceId={space.data.id} />
          <div className={styles.footer}>
            <UserPanel variant="panel" />
            <div className={styles.prefs}>
              <ThemeToggle withLabel />
              <LanguageSelect />
            </div>
          </div>
        </aside>
      )}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
