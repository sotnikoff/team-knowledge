import { isExpired, type Session } from '@/domain/auth/Session'
import type { Clock } from '../../ports/Clock'
import type { SessionStore } from '../../ports/SessionStore'

/**
 * The current session, or `null` if there is none or it has expired. Pure read
 * (the UI calls it while rendering); an expired session is overwritten by the next sign-in.
 */
export class GetSession {
  private readonly sessions: SessionStore
  private readonly clock: Clock

  constructor(sessions: SessionStore, clock: Clock) {
    this.sessions = sessions
    this.clock = clock
  }

  execute(): Session | null {
    const session = this.sessions.load()
    return session && !isExpired(session, this.clock.now()) ? session : null
  }
}
