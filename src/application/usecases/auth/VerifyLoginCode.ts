import { normalizeLoginCode } from '@/domain/auth/code'
import { normalizeEmail } from '@/domain/auth/email'
import type { Session } from '@/domain/auth/Session'
import type { AuthGateway } from '../../ports/AuthGateway'
import type { SessionStore } from '../../ports/SessionStore'

/** Step 2: exchange the code for a session and remember it. */
export class VerifyLoginCode {
  private readonly auth: AuthGateway
  private readonly sessions: SessionStore

  constructor(auth: AuthGateway, sessions: SessionStore) {
    this.auth = auth
    this.sessions = sessions
  }

  async execute(input: { email: string; code: string }): Promise<Session> {
    const session = await this.auth.verifyCode(normalizeEmail(input.email), normalizeLoginCode(input.code))
    this.sessions.save(session)
    return session
  }
}
