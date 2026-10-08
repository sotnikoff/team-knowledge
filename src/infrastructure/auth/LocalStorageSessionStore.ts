import type { SessionStore } from '@/application/ports/SessionStore'
import type { Session } from '@/domain/auth/Session'
import type { KeyValueStore } from '../persistence/local/KeyValueStore'
import { sessionFromDto, sessionToDto } from './userMapper'

/**
 * Client-side state, needed with any backend, so it lives outside the `tk3:`
 * data namespace (like the theme and language settings).
 */
export const SESSION_KEY = 'team-knowledge:session'

/**
 * The session in the browser's storage. Missing, unreadable or corrupted
 * storage means "signed out": the user just signs in again.
 */
export class LocalStorageSessionStore implements SessionStore {
  private readonly store: KeyValueStore
  private readonly listeners = new Set<() => void>()
  /** Parsed once per stored value: `load()` must return a stable object for React. */
  private cached: { raw: string | null; session: Session | null } | null = null

  constructor(store: KeyValueStore, events?: Pick<Window, 'addEventListener'>) {
    this.store = store
    // Sign-in / sign-out in another tab.
    events?.addEventListener('storage', (e) => {
      if (e.key === SESSION_KEY || e.key === null) this.notify()
    })
  }

  current(): string | null {
    return this.load()?.accessToken ?? null
  }

  load(): Session | null {
    const raw = this.read()
    if (this.cached?.raw !== raw) this.cached = { raw, session: parse(raw) }
    return this.cached.session
  }

  save(session: Session): void {
    try {
      this.store.setItem(SESSION_KEY, JSON.stringify(sessionToDto(session)))
    } catch {
      // Private mode etc.: the session just won't survive a reload.
      this.cached = { raw: null, session }
    }
    this.notify()
  }

  clear(): void {
    try {
      this.store.removeItem(SESSION_KEY)
    } catch {
      // Nothing to forget if storage is unavailable.
    }
    this.cached = { raw: null, session: null }
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private read(): string | null {
    try {
      return this.store.getItem(SESSION_KEY)
    } catch {
      return this.cached?.raw ?? null
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}

function parse(raw: string | null): Session | null {
  if (raw === null) return null
  try {
    return sessionFromDto(JSON.parse(raw))
  } catch {
    return null
  }
}
