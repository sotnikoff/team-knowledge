import type { Document, DocumentId } from '@/domain/document/Document'
import type { DocumentRepository } from '../../ports/DocumentRepository'

export class OpenDocument {
  private readonly documents: DocumentRepository

  constructor(documents: DocumentRepository) {
    this.documents = documents
  }

  execute(id: DocumentId): Promise<Document> {
    return this.documents.get(id)
  }
}
