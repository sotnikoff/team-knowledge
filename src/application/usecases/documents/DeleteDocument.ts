import type { DocumentId } from '@/domain/document/Document'
import type { DocumentRepository } from '../../ports/DocumentRepository'

export class DeleteDocument {
  private readonly documents: DocumentRepository

  constructor(documents: DocumentRepository) {
    this.documents = documents
  }

  execute(id: DocumentId): Promise<void> {
    return this.documents.delete(id)
  }
}
