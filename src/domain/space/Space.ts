import type { ProjectId } from '../project/Project'
import { normalizeName } from '../shared/name'
import type { Draft, Versioned } from '../shared/versioned'

export type SpaceId = string

/**
 * A "зарисовка": a container of boards and documents inside a project. It does
 * not list its children — they point to it via `spaceId` (like
 * `GET /spaces/:id/boards`); it points to its project the same way.
 */
export interface Space extends Versioned {
  readonly id: SpaceId
  readonly projectId: ProjectId
  readonly name: string
}

export type SpaceDraft = Draft<Space>

/** A new space; the repository gives it an id when it is created. */
export function newSpace(params: { projectId: ProjectId; name: string }): SpaceDraft {
  return { projectId: params.projectId, name: normalizeName(params.name) }
}

export function renameSpace(space: Space, name: string, now: Date): Space {
  return { ...space, name: normalizeName(name), updatedAt: now }
}
