import type { Space } from '@/domain/space/Space'
import {
  asObject,
  checkSchemaVersion,
  field,
  isString,
  parseVersioned,
  versionedToDto,
} from './common'
import { SPACE_SCHEMA_VERSION, type SpaceDto } from './SpaceDto'

export function spaceToDto(space: Space): SpaceDto {
  return { ...versionedToDto(space), schemaVersion: SPACE_SCHEMA_VERSION, name: space.name }
}

export function spaceFromDto(raw: unknown): Space {
  const obj = asObject(raw, 'space')
  checkSchemaVersion(obj, SPACE_SCHEMA_VERSION)
  return { ...parseVersioned(obj), name: field(obj, 'name', isString, 'a string') }
}
