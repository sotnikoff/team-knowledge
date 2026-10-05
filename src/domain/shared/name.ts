import { InvalidNameError } from './errors'

export const NAME_MAX_LENGTH = 100

/** Names of spaces, boards and documents: trimmed, non-empty, bounded. */
export function normalizeName(raw: string): string {
  const name = raw.trim()
  if (name.length === 0) throw new InvalidNameError('name must not be empty')
  if (name.length > NAME_MAX_LENGTH) {
    throw new InvalidNameError(`name must be at most ${NAME_MAX_LENGTH} characters`)
  }
  return name
}
