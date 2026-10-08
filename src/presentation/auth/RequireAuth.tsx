import { Navigate, Outlet, useLocation } from 'react-router'
import { needsProfile } from '@/domain/auth/User'
import { useSession } from './useSession'

/** Where to return after signing in (`location.state` of `/login`). */
export interface LoginRedirect {
  readonly from?: string
}

/**
 * Layout route around everything but `/login`: without a session — or before a
 * new user has filled in the profile — the app is not shown.
 */
export function RequireAuth() {
  const session = useSession()
  const location = useLocation()
  if (!session || needsProfile(session.user)) {
    const state: LoginRedirect = { from: `${location.pathname}${location.search}${location.hash}` }
    return <Navigate to="/login" replace state={state} />
  }
  return <Outlet />
}
