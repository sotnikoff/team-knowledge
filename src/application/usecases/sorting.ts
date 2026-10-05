import type { Versioned } from '@/domain/shared/versioned'

/** Most recently updated first. */
export const byRecentUpdate = (a: Versioned, b: Versioned) => b.updatedAt.getTime() - a.updatedAt.getTime()
