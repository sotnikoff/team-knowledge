/** Namespace of all keys this app writes to localStorage. */
export const DEFAULT_PREFIX = 'tk3'

/**
 * Prefixes of older formats whose data is no longer readable: `tk:` (before
 * spaces) and `tk2:` (spaces without projects).
 */
const LEGACY_PREFIXES = ['tk:', 'tk2:']

/** Removes data written by older versions of the app. */
export function purgeLegacyData(storage: Storage): void {
  const legacy: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) legacy.push(key)
  }
  for (const key of legacy) storage.removeItem(key)
}
