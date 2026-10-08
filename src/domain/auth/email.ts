import { InvalidEmailError } from '../shared/errors'

export const EMAIL_MAX_LENGTH = 254

/** Trimmed and lower-cased, so one address is always one account. */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase()
  if (email.length > EMAIL_MAX_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InvalidEmailError()
  }
  return email
}
