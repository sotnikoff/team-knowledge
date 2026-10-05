import type { VersionedDto } from './common'

/**
 * Wire format of a text document. `content` is a ProseMirror-style JSON tree
 * (what the TipTap editor produces) — the backend can store it as JSON as-is.
 */
export const DOCUMENT_SCHEMA_VERSION = 1

export interface RichTextMarkDto {
  type: string
  attrs?: Record<string, unknown>
}

export interface RichTextNodeDto {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNodeDto[]
  marks?: RichTextMarkDto[]
  text?: string
}

export interface DocumentSummaryDto extends VersionedDto {
  spaceId: string
  title: string
}

export interface DocumentDto extends DocumentSummaryDto {
  schemaVersion: number
  content: RichTextNodeDto
}
