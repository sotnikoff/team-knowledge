import { normalizeName } from '../shared/name'
import type { Draft, Versioned } from '../shared/versioned'

export type ProjectId = string

/**
 * The top level: a project groups spaces ("зарисовки"). It does not list its
 * children — spaces point to it via `projectId` (like `GET /projects/:id/spaces`).
 */
export interface Project extends Versioned {
  readonly id: ProjectId
  readonly name: string
}

export type ProjectDraft = Draft<Project>

/** A new project; the repository gives it an id when it is created. */
export function newProject(params: { name: string }): ProjectDraft {
  return { name: normalizeName(params.name) }
}

export function renameProject(project: Project, name: string, now: Date): Project {
  return { ...project, name: normalizeName(name), updatedAt: now }
}
