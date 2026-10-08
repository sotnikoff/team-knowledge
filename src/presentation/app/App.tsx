import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { UnauthorizedError } from '@/domain/shared/errors'
import { isRetryable } from '../errors'
import type { AppDependencies } from './dependencies'
import { DependenciesProvider } from './DependenciesProvider'
import { prefetchPagesWhenIdle, routes } from './routes'

const router = createBrowserRouter(routes)
prefetchPagesWhenIdle()

export function App(props: { dependencies: AppDependencies }) {
  const [queryClient] = useState(() => {
    // The backend rejected the token (expired / revoked): sign out, `RequireAuth` shows the login page.
    const onError = (error: unknown) => {
      if (error instanceof UnauthorizedError) props.dependencies.logout.execute()
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          retry: (failures, error) => isRetryable(error) && failures < 2,
          refetchOnWindowFocus: false,
        },
      },
    })
  })
  return (
    <DependenciesProvider value={props.dependencies}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </DependenciesProvider>
  )
}
