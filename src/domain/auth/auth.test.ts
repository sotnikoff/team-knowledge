import { describe, expect, it } from 'vitest'
import { InvalidCodeError, InvalidEmailError, InvalidNameError } from '../shared/errors'
import { normalizeLoginCode } from './code'
import { normalizeEmail } from './email'
import { isExpired } from './Session'
import { needsProfile, newProfile, type User } from './User'

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Ann@Example.COM ')).toBe('ann@example.com')
  })

  it.each(['', 'ann', 'ann@', '@example.com', 'ann@example', 'a b@example.com'])('rejects "%s"', (raw) => {
    expect(() => normalizeEmail(raw)).toThrow(InvalidEmailError)
  })
})

describe('normalizeLoginCode', () => {
  it('accepts six digits, ignoring spaces', () => {
    expect(normalizeLoginCode(' 123 456 ')).toBe('123456')
  })

  it.each(['', '12345', '1234567', '12a456'])('rejects "%s" as a format error', (raw) => {
    expect(() => normalizeLoginCode(raw)).toThrow(new InvalidCodeError('format'))
  })
})

describe('profile', () => {
  const user: User = { id: 'u1', email: 'a@b.cd', name: null, company: null, createdAt: new Date(0) }

  it('is needed until the user has a name', () => {
    expect(needsProfile(user)).toBe(true)
    expect(needsProfile({ ...user, name: 'Ann' })).toBe(false)
  })

  it('requires a name and makes the company optional', () => {
    expect(newProfile({ name: ' Ann ', company: '  ' })).toEqual({ name: 'Ann', company: null })
    expect(newProfile({ name: 'Ann', company: ' Acme ' })).toEqual({ name: 'Ann', company: 'Acme' })
    expect(() => newProfile({ name: ' ', company: 'Acme' })).toThrow(InvalidNameError)
    expect(() => newProfile({ name: 'Ann', company: 'x'.repeat(101) })).toThrow(InvalidNameError)
  })
})

describe('session', () => {
  it('expires at expiresAt', () => {
    const session = { accessToken: 't', expiresAt: new Date(1000), user: { id: 'u', email: 'a@b.cd', name: 'A', company: null, createdAt: new Date(0) } }
    expect(isExpired(session, new Date(999))).toBe(false)
    expect(isExpired(session, new Date(1000))).toBe(true)
  })
})
