import { describe, expect, it } from 'vitest'
import type { Session } from '@/domain/auth/Session'
import type { Profile, User } from '@/domain/auth/User'
import { InvalidCodeError, InvalidEmailError, InvalidNameError, UnauthorizedError } from '@/domain/shared/errors'
import type { AuthGateway } from '../../ports/AuthGateway'
import type { SessionStore } from '../../ports/SessionStore'
import { CompleteProfile, GetSession, Logout, RequestLoginCode, VerifyLoginCode } from '../index'

const user: User = { id: 'u1', email: 'ann@example.com', name: null, company: null, createdAt: new Date(0) }
const session: Session = { accessToken: 'token', expiresAt: new Date(10_000), user }

function memorySessions(): SessionStore & { value: Session | null } {
  return {
    value: null,
    current() {
      return this.value?.accessToken ?? null
    },
    load() {
      return this.value
    },
    save(s) {
      this.value = s
    },
    clear() {
      this.value = null
    },
    subscribe: () => () => {},
  }
}

function fakeGateway() {
  const calls: unknown[][] = []
  const gateway: AuthGateway = {
    requestCode: async (email) => void calls.push(['requestCode', email]),
    verifyCode: async (email, code) => {
      calls.push(['verifyCode', email, code])
      return session
    },
    updateProfile: async (profile: Profile) => ({ ...user, ...profile }),
  }
  return { gateway, calls }
}

describe('auth use cases', () => {
  it('requests a code for the normalized email', async () => {
    const { gateway, calls } = fakeGateway()
    await new RequestLoginCode(gateway).execute({ email: ' Ann@Example.com ' })
    expect(calls).toEqual([['requestCode', 'ann@example.com']])
    await expect(new RequestLoginCode(gateway).execute({ email: 'nope' })).rejects.toBeInstanceOf(InvalidEmailError)
  })

  it('verifies the code and remembers the session', async () => {
    const { gateway, calls } = fakeGateway()
    const sessions = memorySessions()
    await new VerifyLoginCode(gateway, sessions).execute({ email: 'ann@example.com', code: '123 456' })
    expect(calls).toEqual([['verifyCode', 'ann@example.com', '123456']])
    expect(sessions.current()).toBe('token')
  })

  it('rejects a malformed code without asking the gateway', async () => {
    const { gateway, calls } = fakeGateway()
    await expect(
      new VerifyLoginCode(gateway, memorySessions()).execute({ email: 'ann@example.com', code: '12' }),
    ).rejects.toBeInstanceOf(InvalidCodeError)
    expect(calls).toEqual([])
  })

  it('completes the profile and updates the stored user', async () => {
    const { gateway } = fakeGateway()
    const sessions = memorySessions()
    sessions.save(session)
    const updated = await new CompleteProfile(gateway, sessions).execute({ name: ' Ann ', company: '' })
    expect(updated).toMatchObject({ name: 'Ann', company: null })
    expect(sessions.load()?.user.name).toBe('Ann')
    await expect(new CompleteProfile(gateway, sessions).execute({ name: '', company: '' })).rejects.toBeInstanceOf(
      InvalidNameError,
    )
    sessions.clear()
    await expect(new CompleteProfile(gateway, sessions).execute({ name: 'Ann', company: '' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('ignores an expired session', () => {
    const sessions = memorySessions()
    sessions.save(session)
    expect(new GetSession(sessions, { now: () => new Date(9_999) }).execute()).toBe(session)
    expect(new GetSession(sessions, { now: () => new Date(10_000) }).execute()).toBeNull()
  })

  it('logs out', () => {
    const sessions = memorySessions()
    sessions.save(session)
    new Logout(sessions).execute()
    expect(sessions.current()).toBeNull()
  })
})
