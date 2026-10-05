import type { VersionedDto } from './common'

/**
 * Wire format of a board. This is the JSON contract shared by every
 * persistence adapter (localStorage today, the HTTP API tomorrow), so the
 * backend can adopt it as-is.
 *
 * Additive, optional fields keep the version (the mapper fills defaults).
 * Bump `BOARD_SCHEMA_VERSION` and teach `boardMapper` to migrate when the
 * shape changes incompatibly.
 */
export const BOARD_SCHEMA_VERSION = 1

export interface PointDto {
  x: number
  y: number
}

export interface ElementStyleDto {
  strokeColor: string
  fillColor: string
  strokeWidth: number
  roughness: number
}

export interface BindingDto {
  elementId: string
  anchor: 'top' | 'right' | 'bottom' | 'left'
}

export interface ElementDto {
  id: string
  type: 'rectangle' | 'ellipse' | 'diamond' | 'line' | 'arrow' | 'freedraw' | 'text' | 'document'
  x: number
  y: number
  width: number
  height: number
  seed: number
  style: ElementStyleDto
  /** line | arrow | freedraw */
  points?: PointDto[]
  /** line | arrow; absent in older data = not bound */
  startBinding?: BindingDto | null
  endBinding?: BindingDto | null
  /** rectangle | ellipse | diamond; absent in older data = '' */
  label?: string
  /** document: id of the referenced text document */
  documentId?: string
  /** text */
  text?: string
  fontSize?: number
}

export interface BoardSummaryDto extends VersionedDto {
  spaceId: string
  name: string
}

export interface BoardDto extends BoardSummaryDto {
  schemaVersion: number
  elements: ElementDto[]
}
