import { newProfile, type User } from '@/domain/auth/User'
import { UnauthorizedError } from '@/domain/shared/errors'
import type { AuthGateway } from '../../ports/AuthGateway'
import type { SessionStore } from '../../ports/SessionStore'

/** Post-registration: a new user tells their name (and, optionally, company). */
export class CompleteProfile {
  private readonly auth: AuthGateway
  private readonly sessions: SessionStore

  constructor(auth: AuthGateway, sessions: SessionStore) {
    this.auth = auth
    this.sessions = sessions
  }

  async execute(input: { name: string; company: string }): Promise<User> {
    const profile = newProfile(input)
    const user = await this.auth.updateProfile(profile)
    const session = this.sessions.load()
    if (!session) throw new UnauthorizedError()
    this.sessions.save({ ...session, user })
    return user
  }
}
