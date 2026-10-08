import type { Session } from '@/domain/auth/Session'
import type { User } from '@/domain/auth/User'
import { asObject, field, isString, optional, parseDate, parseString } from '../persistence/dto/common'

/** Wire form of `User` (`GET /me`, the `user` of `POST /auth/verify`). */
export interface UserDto {
  id: string
  email: string
  name: string | null
  company: string | null
  createdAt: string
}

/** Wire form of `Session` (`POST /auth/verify` response). */
export interface SessionDto {
  accessToken: string
  expiresAt: string
  user: UserDto
}

export function userToDto(user: User): UserDto {
  return { ...user, createdAt: user.createdAt.toISOString() }
}

export function userFromDto(raw: unknown): User {
  const obj = asObject(raw, 'user')
  return {
    id: field(obj, 'id', isString, 'a string'),
    email: field(obj, 'email', isString, 'a string'),
    name: optional(obj, 'name', parseString, null),
    company: optional(obj, 'company', parseString, null),
    createdAt: parseDate(obj, 'createdAt'),
  }
}

export function sessionToDto(session: Session): SessionDto {
  return {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt.toISOString(),
    user: userToDto(session.user),
  }
}

export function sessionFromDto(raw: unknown): Session {
  const obj = asObject(raw, 'session')
  return {
    accessToken: field(obj, 'accessToken', isString, 'a string'),
    expiresAt: parseDate(obj, 'expiresAt'),
    user: userFromDto(obj.user),
  }
}
