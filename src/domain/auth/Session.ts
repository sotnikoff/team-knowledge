import type { User } from './User'

/**
 * The signed-in state: an opaque access token (a JWT issued by the backend)
 * and the user it belongs to. The domain never looks inside the token.
 */
export interface Session {
  readonly accessToken: string
  readonly expiresAt: Date
  readonly user: User
}

export function isExpired(session: Session, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime()
}
