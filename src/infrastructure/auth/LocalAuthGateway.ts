import type { AccessTokenProvider } from '@/application/ports/AccessTokenProvider'
import type { AuthGateway } from '@/application/ports/AuthGateway'
import { normalizeLoginCode } from '@/domain/auth/code'
import { normalizeEmail } from '@/domain/auth/email'
import type { Session } from '@/domain/auth/Session'
import type { Profile, User } from '@/domain/auth/User'
import { InvalidCodeError, StorageUnavailableError, UnauthorizedError } from '@/domain/shared/errors'
import type { KeyValueStore } from '../persistence/local/KeyValueStore'
import type { LocalIdentity } from '../persistence/local/LocalCollection'
import { DEFAULT_PREFIX } from '../persistence/local/prefix'
import { issueFakeJwt, readFakeJwt } from './fakeJwt'
import { userFromDto, userToDto } from './userMapper'

/** Entering this code is how to test a wrong code: no email is sent in local mode. */
export const LOCAL_WRONG_CODE = '000000'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * Plays the auth server for the localStorage mode. There is no mail, so any
 * six-digit code is accepted except `000000`, which is always "wrong".
 * Users are kept in `tk3:users`; tokens are unsigned JWTs.
 */
export class LocalAuthGateway implements AuthGateway {
  private readonly store: KeyValueStore
  private readonly identity: LocalIdentity
  private readonly tokens: AccessTokenProvider
  private readonly key: string

  constructor(store: KeyValueStore, identity: LocalIdentity, tokens: AccessTokenProvider, prefix = DEFAULT_PREFIX) {
    this.store = store
    this.identity = identity
    this.tokens = tokens
    this.key = `${prefix}:users`
  }

  async requestCode(email: string): Promise<void> {
    normalizeEmail(email)
  }

  async verifyCode(email: string, code: string): Promise<Session> {
    const address = normalizeEmail(email)
    if (normalizeLoginCode(code) === LOCAL_WRONG_CODE) throw new InvalidCodeError('wrong')

    const users = this.readUsers()
    let user = users.find((u) => u.email === address)
    if (!user) {
      user = { id: this.identity.ids.next(), email: address, name: null, company: null, createdAt: this.identity.clock.now() }
      this.writeUsers([...users, user])
    }

    const iat = Math.floor(this.identity.clock.now().getTime() / 1000)
    const exp = iat + SESSION_TTL_SECONDS
    return { accessToken: issueFakeJwt({ sub: user.id, email: user.email, iat, exp }), expiresAt: new Date(exp * 1000), user }
  }

  async updateProfile(profile: Profile): Promise<User> {
    const userId = this.authorizedUserId()
    const users = this.readUsers()
    const user = users.find((u) => u.id === userId)
    if (!user) throw new UnauthorizedError('Unknown user')
    const updated: User = { ...user, name: profile.name, company: profile.company }
    this.writeUsers(users.map((u) => (u.id === userId ? updated : u)))
    return updated
  }

  /** What the server does with `Authorization: Bearer …`. */
  private authorizedUserId(): string {
    const token = this.tokens.current()
    const claims = token === null ? null : readFakeJwt(token)
    if (!claims) throw new UnauthorizedError()
    if (claims.exp * 1000 <= this.identity.clock.now().getTime()) throw new UnauthorizedError('Session expired')
    return claims.sub
  }

  private readUsers(): User[] {
    try {
      const raw = this.store.getItem(this.key)
      if (raw === null) return []
      const list: unknown = JSON.parse(raw)
      if (!Array.isArray(list)) throw new Error('users must be an array')
      return list.map(userFromDto)
    } catch (error) {
      throw new StorageUnavailableError('Stored users are unavailable', { cause: error })
    }
  }

  private writeUsers(users: readonly User[]): void {
    try {
      this.store.setItem(this.key, JSON.stringify(users.map(userToDto)))
    } catch (error) {
      throw new StorageUnavailableError('Local storage is unavailable', { cause: error })
    }
  }
}
