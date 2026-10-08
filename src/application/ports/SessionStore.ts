import type { Session } from '@/domain/auth/Session'
import type { AccessTokenProvider } from './AccessTokenProvider'

/**
 * Where the client keeps its session between page loads. It is client state,
 * not server data, so the same store is used with any persistence backend.
 */
export interface SessionStore extends AccessTokenProvider {
  load(): Session | null
  save(session: Session): void
  clear(): void
  /** Called after every `save`/`clear` (also from other tabs). Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
}
