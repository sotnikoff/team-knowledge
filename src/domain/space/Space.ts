import { normalizeName } from '../shared/name'
import type { Draft, Versioned } from '../shared/versioned'

export type SpaceId = string

/**
 * A "зарисовка": a container of boards and documents. It does not list its
 * children — they point to it via `spaceId` (like `GET /spaces/:id/boards`).
 */
export interface Space extends Versioned {
  readonly id: SpaceId
  readonly name: string
}

export type SpaceDraft = Draft<Space>

/** A new space; the repository gives it an id when it is created. */
export function newSpace(params: { name: string }): SpaceDraft {
  return { name: normalizeName(params.name) }
}

export function renameSpace(space: Space, name: string, now: Date): Space {
  return { ...space, name: normalizeName(name), updatedAt: now }
}
