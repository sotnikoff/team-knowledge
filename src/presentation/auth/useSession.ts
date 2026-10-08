import { useSyncExternalStore } from 'react'
import type { Session } from '@/domain/auth/Session'
import { useDependencies } from '../app/dependencies'

/** The signed-in session (re-renders on sign-in / sign-out, also in other tabs). */
export function useSession(): Session | null {
  const { sessions, getSession } = useDependencies()
  return useSyncExternalStore(
    (listener) => sessions.subscribe(listener),
    () => getSession.execute(),
  )
}
