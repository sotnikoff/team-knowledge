import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { isRetryable } from '../errors'
import { BoardEditorPage } from '../pages/BoardEditorPage'
import { DocumentPage } from '../pages/DocumentPage'
import { SpaceLayout } from '../pages/SpaceLayout'
import { SpaceOverviewPage } from '../pages/SpaceOverviewPage'
import { SpacesListPage } from '../pages/SpacesListPage'
import type { AppDependencies } from './dependencies'
import { DependenciesProvider } from './DependenciesProvider'

const router = createBrowserRouter([
  { path: '/', element: <SpacesListPage /> },
  {
    path: '/spaces/:spaceId',
    element: <SpaceLayout />,
    children: [
      { index: true, element: <SpaceOverviewPage /> },
      { path: 'boards/:boardId', element: <BoardEditorPage /> },
      { path: 'docs/:documentId', element: <DocumentPage /> },
    ],
  },
])

export function App(props: { dependencies: AppDependencies }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failures, error) => isRetryable(error) && failures < 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )
  return (
    <DependenciesProvider value={props.dependencies}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </DependenciesProvider>
  )
}
