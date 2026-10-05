import type { Document, DocumentSummary } from '@/domain/document/Document'
import type { RichText, RichTextMark, RichTextNode } from '@/domain/document/richText'
import {
  asObject,
  checkSchemaVersion,
  field,
  InvalidDataError,
  isArray,
  isString,
  parseVersioned,
  versionedToDto,
  type Json,
} from './common'
import {
  DOCUMENT_SCHEMA_VERSION,
  type DocumentDto,
  type DocumentSummaryDto,
  type RichTextNodeDto,
} from './DocumentDto'

// ---------- domain -> DTO ----------

export function documentSummaryToDto(summary: DocumentSummary): DocumentSummaryDto {
  return { ...versionedToDto(summary), spaceId: summary.spaceId, title: summary.title }
}

export function documentToDto(doc: Document): DocumentDto {
  return {
    ...documentSummaryToDto(doc),
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    // Plain JSON already; copying detaches it from the caller.
    content: structuredClone(doc.content) as RichTextNodeDto,
  }
}

// ---------- DTO -> domain ----------

function parseAttrs(obj: Json): Record<string, unknown> | undefined {
  const attrs = obj.attrs
  if (attrs === undefined) return undefined
  return asObject(attrs, '"attrs"')
}

function parseMark(raw: unknown): RichTextMark {
  const obj = asObject(raw, 'mark')
  const attrs = parseAttrs(obj)
  return { type: field(obj, 'type', isString, 'a string'), ...(attrs && { attrs }) }
}

function parseNode(raw: unknown): RichTextNode {
  const obj = asObject(raw, 'rich text node')
  const attrs = parseAttrs(obj)
  const node: { -readonly [K in keyof RichTextNode]: RichTextNode[K] } = {
    type: field(obj, 'type', isString, 'a string'),
  }
  if (attrs) node.attrs = attrs
  if (obj.content !== undefined) node.content = field(obj, 'content', isArray, 'an array').map(parseNode)
  if (obj.marks !== undefined) node.marks = field(obj, 'marks', isArray, 'an array').map(parseMark)
  if (obj.text !== undefined) node.text = field(obj, 'text', isString, 'a string')
  return node
}

export function parseRichText(raw: unknown): RichText {
  const node = parseNode(raw)
  if (node.type !== 'doc') throw new InvalidDataError('rich text root must be of type "doc"')
  return { ...node, type: 'doc' }
}

export function documentSummaryFromDto(raw: unknown): DocumentSummary {
  const obj = asObject(raw, 'document')
  return {
    ...parseVersioned(obj),
    spaceId: field(obj, 'spaceId', isString, 'a string'),
    title: field(obj, 'title', isString, 'a string'),
  }
}

export function documentFromDto(raw: unknown): Document {
  const obj = asObject(raw, 'document')
  checkSchemaVersion(obj, DOCUMENT_SCHEMA_VERSION)
  return { ...documentSummaryFromDto(obj), content: parseRichText(obj.content) }
}
