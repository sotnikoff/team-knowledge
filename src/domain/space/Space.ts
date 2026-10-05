import { normalizeName } from '../shared/name'
import type { Versioned } from '../shared/versioned'

export type SpaceId = string

/**
 * A "зарисовка": a container of boards and documents. It does not list its
 * children — they point to it via `spaceId` (like `GET /spaces/:id/boards`).
 */
export interface Space extends Versioned {
  readonly id: SpaceId
  readonly name: string
}

export function createSpace(params: { id: SpaceId; name: string; now: Date }): Space {
  return {
    id: params.id,
    name: normalizeName(params.name),
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  }
}

export function renameSpace(space: Space, name: string, now: Date): Space {
  return { ...space, name: normalizeName(name), updatedAt: now }
}
