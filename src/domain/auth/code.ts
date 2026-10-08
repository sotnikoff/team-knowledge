import { InvalidCodeError } from '../shared/errors'

export const LOGIN_CODE_LENGTH = 6

/** The one-time code from the email: exactly six digits (spaces are ignored). */
export function normalizeLoginCode(raw: string): string {
  const code = raw.replace(/\s+/g, '')
  if (!new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`).test(code)) throw new InvalidCodeError('format')
  return code
}
