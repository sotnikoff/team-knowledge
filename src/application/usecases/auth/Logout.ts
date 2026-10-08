import type { SessionStore } from '../../ports/SessionStore'

/** Forgets the session on this client (a JWT needs no server call to sign out). */
export class Logout {
  private readonly sessions: SessionStore

  constructor(sessions: SessionStore) {
    this.sessions = sessions
  }

  execute(): void {
    this.sessions.clear()
  }
}
