import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { isRetryable } from '../errors'
import type { AppDependencies } from './dependencies'
import { DependenciesProvider } from './DependenciesProvider'
import { prefetchPagesWhenIdle, routes } from './routes'

const router = createBrowserRouter(routes)
prefetchPagesWhenIdle()

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
