import { describe, expect, it } from 'vitest'
import { runAuthGatewayContract } from '@/application/ports/authGateway.contract'
import { InvalidCodeError } from '@/domain/shared/errors'
import { InMemoryKeyValueStore } from '../persistence/local/KeyValueStore'
import type { LocalIdentity } from '../persistence/local/LocalCollection'
import { issueFakeJwt, readFakeJwt } from './fakeJwt'
import { LOCAL_WRONG_CODE, LocalAuthGateway } from './LocalAuthGateway'
import { LocalStorageSessionStore, SESSION_KEY } from './LocalStorageSessionStore'

const t0 = new Date('2026-01-01T00:00:00.000Z')

function testIdentity(): LocalIdentity {
  let counter = 0
  return { ids: { next: () => `user-${++counter}` }, clock: { now: () => t0 } }
}

runAuthGatewayContract({
  name: 'LocalAuthGateway',
  make: (sessions) => new LocalAuthGateway(new InMemoryKeyValueStore(), testIdentity(), sessions),
  validCode: () => '123456',
})

describe('LocalAuthGateway', () => {
  const gateway = () => new LocalAuthGateway(new InMemoryKeyValueStore(), testIdentity(), { current: () => null })

  it('accepts any six-digit code except 000000', async () => {
    await expect(gateway().verifyCode('ann@example.com', '987654')).resolves.toBeDefined()
    await expect(gateway().verifyCode('ann@example.com', LOCAL_WRONG_CODE)).rejects.toEqual(
      new InvalidCodeError('wrong'),
    )
    await expect(gateway().verifyCode('ann@example.com', '12')).rejects.toEqual(new InvalidCodeError('format'))
  })

  it('issues a JWT-shaped token for the user', async () => {
    const session = await gateway().verifyCode('Ann@Example.com', '123456')
    expect(session.accessToken.split('.')).toHaveLength(3)
    expect(readFakeJwt(session.accessToken)).toMatchObject({ sub: session.user.id, email: 'ann@example.com' })
    expect(session.expiresAt.getTime()).toBe(t0.getTime() + 30 * 24 * 60 * 60 * 1000)
  })
})

describe('fakeJwt', () => {
  it('round-trips claims, including non-ASCII', () => {
    const claims = { sub: 'u1', email: 'аня@пример.рф', iat: 1, exp: 2 }
    expect(readFakeJwt(issueFakeJwt(claims))).toEqual(claims)
  })

  it('rejects garbage', () => {
    expect(readFakeJwt('nope')).toBeNull()
    expect(readFakeJwt('a.b.c')).toBeNull()
  })
})

describe('LocalStorageSessionStore', () => {
  const session = {
    accessToken: 'token',
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    user: { id: 'u1', email: 'ann@example.com', name: 'Ann', company: null, createdAt: t0 },
  }

  it('keeps the session and notifies subscribers', () => {
    const kv = new InMemoryKeyValueStore()
    const store = new LocalStorageSessionStore(kv)
    let calls = 0
    store.subscribe(() => calls++)

    store.save(session)
    expect(new LocalStorageSessionStore(kv).load()).toEqual(session)
    expect(store.current()).toBe('token')
    expect(store.load()).toBe(store.load())

    store.clear()
    expect(store.load()).toBeNull()
    expect(calls).toBe(2)
  })

  it('treats corrupted data as signed out', () => {
    const kv = new InMemoryKeyValueStore()
    kv.setItem(SESSION_KEY, '{"accessToken": 1}')
    expect(new LocalStorageSessionStore(kv).load()).toBeNull()
  })
})
