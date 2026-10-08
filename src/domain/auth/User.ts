import { InvalidNameError } from '../shared/errors'
import { NAME_MAX_LENGTH, normalizeName } from '../shared/name'

export type UserId = string

/**
 * An account. It is created by the first successful sign-in with an email;
 * `name` stays `null` until the user fills in the profile (post-registration).
 */
export interface User {
  readonly id: UserId
  readonly email: string
  readonly name: string | null
  readonly company: string | null
  readonly createdAt: Date
}

/** What the post-registration form sends. */
export interface Profile {
  readonly name: string
  readonly company: string | null
}

/** A just-registered user has to tell us who they are before going on. */
export function needsProfile(user: User): boolean {
  return user.name === null
}

/** Name is required; company is optional (empty = none). */
export function newProfile(params: { name: string; company: string }): Profile {
  const company = params.company.trim()
  if (company.length > NAME_MAX_LENGTH) {
    throw new InvalidNameError(`company must be at most ${NAME_MAX_LENGTH} characters`)
  }
  return { name: normalizeName(params.name), company: company.length > 0 ? company : null }
}
