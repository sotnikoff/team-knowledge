import type { SpaceId } from '../space/Space'
import { normalizeName } from '../shared/name'
import type { Draft, Versioned } from '../shared/versioned'
import { emptyRichText, type RichText } from './richText'

export type DocumentId = string

/** Lightweight projection used for listings (no content). */
export interface DocumentSummary extends Versioned {
  readonly id: DocumentId
  readonly spaceId: SpaceId
  readonly title: string
}

export interface Document extends DocumentSummary {
  readonly content: RichText
}

export type DocumentDraft = Draft<Document>

/** A new, empty document; the repository gives it an id when it is created. */
export function newDocument(params: { spaceId: SpaceId; title: string }): DocumentDraft {
  return { spaceId: params.spaceId, title: normalizeName(params.title), content: emptyRichText }
}

export function renameDocument(doc: Document, title: string, now: Date): Document {
  return { ...doc, title: normalizeName(title), updatedAt: now }
}

export function replaceContent(doc: Document, content: RichText, now: Date): Document {
  return { ...doc, content, updatedAt: now }
}

export function toDocumentSummary(doc: Document): DocumentSummary {
  const { content: _content, ...summary } = doc
  return summary
}
