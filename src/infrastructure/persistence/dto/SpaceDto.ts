import type { VersionedDto } from './common'

/** Wire format of a space ("зарисовка"). Shared by every adapter. */
export const SPACE_SCHEMA_VERSION = 1

export interface SpaceDto extends VersionedDto {
  schemaVersion: number
  projectId: string
  name: string
}
