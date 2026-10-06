import type { RouteObject } from 'react-router'
import { ProjectPage } from '../pages/ProjectPage'
import { ProjectsListPage } from '../pages/ProjectsListPage'
import { SpaceLayout } from '../pages/SpaceLayout'

/**
 * Route-level code splitting. The shell (projects list, a project's spaces,
 * space layout with the sidebar) is in the entry chunk; heavy pages are separate chunks:
 * the board editor (roughjs, canvas, export) and the document editor (TipTap,
 * syntax highlighting). Each loader is a plain dynamic import, so the same
 * function serves the router and the idle-time prefetch below.
 */
const pages = {
  overview: () => import('../pages/SpaceOverviewPage').then((m) => ({ Component: m.SpaceOverviewPage })),
  board: () => import('../pages/BoardEditorPage').then((m) => ({ Component: m.BoardEditorPage })),
  document: () => import('../pages/DocumentPage').then((m) => ({ Component: m.DocumentPage })),
}

export const routes: RouteObject[] = [
  { path: '/', element: <ProjectsListPage /> },
  { path: '/projects/:projectId', element: <ProjectPage /> },
  {
    path: '/spaces/:spaceId',
    element: <SpaceLayout />,
    children: [
      { index: true, lazy: pages.overview },
      { path: 'boards/:boardId', lazy: pages.board },
      { path: 'docs/:documentId', lazy: pages.document },
    ],
  },
]

/**
 * After the first screen is idle, fetch the other pages in the background so
 * that opening a board or a document does not wait for the network.
 */
export function prefetchPagesWhenIdle(): void {
  const prefetch = () => {
    for (const load of Object.values(pages)) void load().catch(() => {})
  }
  // Wait for `load` first: before it the browser may look idle while it is
  // still waiting for critical resources, and prefetching would compete with them.
  const whenIdle = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(prefetch, { timeout: 4000 })
    else setTimeout(prefetch, 1000)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
}
