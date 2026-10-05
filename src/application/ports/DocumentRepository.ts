import type { Document, DocumentId, DocumentSummary } from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'

/**
 * Driven port for text documents. Mirrors the REST API:
 *
 *   list(spaceId) -> GET    /spaces/:spaceId/documents   (summaries, no content)
 *   get(id)       -> GET    /documents/:id
 *   create(d)     -> POST   /spaces/:spaceId/documents
 *   save(d)       -> PUT    /documents/:id   If-Match: d.version
 *   delete(id)    -> DELETE /documents/:id
 *
 * Shared semantics: see `repository.contract.ts`.
 */
export interface DocumentRepository {
  list(spaceId: SpaceId): Promise<DocumentSummary[]>
  get(id: DocumentId): Promise<Document>
  create(doc: Document): Promise<Document>
  save(doc: Document): Promise<Document>
  delete(id: DocumentId): Promise<void>
}
