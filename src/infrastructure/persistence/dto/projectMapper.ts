import type { Project } from '@/domain/project/Project'
import {
  asObject,
  checkSchemaVersion,
  field,
  isString,
  parseVersioned,
  versionedToDto,
} from './common'
import { PROJECT_SCHEMA_VERSION, type ProjectDto } from './ProjectDto'

export function projectToDto(project: Project): ProjectDto {
  return { ...versionedToDto(project), schemaVersion: PROJECT_SCHEMA_VERSION, name: project.name }
}

export function projectFromDto(raw: unknown): Project {
  const obj = asObject(raw, 'project')
  checkSchemaVersion(obj, PROJECT_SCHEMA_VERSION)
  return { ...parseVersioned(obj), name: field(obj, 'name', isString, 'a string') }
}
