/** Namespace of all keys this app writes to localStorage. */
export const DEFAULT_PREFIX = 'tk2'

/** Prefix used before spaces existed; that data is no longer readable. */
const LEGACY_PREFIX = 'tk:'

/** Removes data written by the pre-spaces version of the app. */
export function purgeLegacyData(storage: Storage): void {
  const legacy: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key?.startsWith(LEGACY_PREFIX)) legacy.push(key)
  }
  for (const key of legacy) storage.removeItem(key)
}
