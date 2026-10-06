import type { VersionedDto } from './common'

/** Wire format of a project. Shared by every adapter. */
export const PROJECT_SCHEMA_VERSION = 1

export interface ProjectDto extends VersionedDto {
  schemaVersion: number
  name: string
}
