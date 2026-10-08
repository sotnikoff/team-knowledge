import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidEmailError, UnauthorizedError } from '@/domain/shared/errors'
import type { AuthGateway } from './AuthGateway'
import type { SessionStore } from './SessionStore'

export interface AuthContractSubject {
  readonly name: string
  /** A gateway authorized by `sessions` (its `current()` token). */
  readonly make: (sessions: SessionStore) => AuthGateway | Promise<AuthGateway>
  /** A code the gateway accepts for `email` after `requestCode(email)`. */
  readonly validCode: (email: string) => string | Promise<string>
}

/**
 * Behavioural contract of every `AuthGateway` adapter:
 *
 * - `requestCode` rejects malformed emails with `InvalidEmailError`;
 * - the first `verifyCode` of an email creates the account (`name === null`)
 *   and returns a session with a non-empty token that expires in the future;
 * - signing in again with the same email returns the same user;
 * - `updateProfile` changes the user behind the current token, and without a
 *   token rejects with `UnauthorizedError`.
 */
export function runAuthGatewayContract(subject: AuthContractSubject): void {
  describe(`auth gateway contract: ${subject.name}`, () => {
    let token: string | null
    let gateway: AuthGateway
    const sessions: SessionStore = {
      current: () => token,
      load: () => null,
      save: (s) => void (token = s.accessToken),
      clear: () => void (token = null),
      subscribe: () => () => {},
    }
    const signIn = async (email: string) => {
      await gateway.requestCode(email)
      const session = await gateway.verifyCode(email, await subject.validCode(email))
      sessions.save(session)
      return session
    }

    beforeEach(async () => {
      token = null
      gateway = await subject.make(sessions)
    })

    it('rejects a malformed email', async () => {
      await expect(gateway.requestCode('not an email')).rejects.toBeInstanceOf(InvalidEmailError)
    })

    it('creates the account on the first sign-in', async () => {
      const session = await signIn('ann@example.com')
      expect(session.accessToken).not.toBe('')
      expect(session.expiresAt.getTime()).toBeGreaterThan(session.user.createdAt.getTime())
      expect(session.user).toMatchObject({ email: 'ann@example.com', name: null, company: null })
    })

    it('returns the same user on the next sign-in, with the profile', async () => {
      const first = await signIn('ann@example.com')
      const updated = await gateway.updateProfile({ name: 'Ann', company: 'Acme' })
      expect(updated).toMatchObject({ id: first.user.id, name: 'Ann', company: 'Acme' })

      sessions.clear()
      const second = await signIn('ann@example.com')
      expect(second.user).toEqual(updated)
      expect((await signIn('bob@example.com')).user.id).not.toBe(first.user.id)
    })

    it('needs a token to update the profile', async () => {
      await expect(gateway.updateProfile({ name: 'Ann', company: null })).rejects.toBeInstanceOf(UnauthorizedError)
    })
  })
}
