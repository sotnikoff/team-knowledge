import { renameDocument, type Document, type DocumentId } from '@/domain/document/Document'
import type { Clock } from '../../ports/Clock'
import type { DocumentRepository } from '../../ports/DocumentRepository'

export class RenameDocument {
  private readonly documents: DocumentRepository
  private readonly clock: Clock

  constructor(documents: DocumentRepository, clock: Clock) {
    this.documents = documents
    this.clock = clock
  }

  async execute(id: DocumentId, title: string): Promise<Document> {
    const doc = await this.documents.get(id)
    return this.documents.save(renameDocument(doc, title, this.clock.now()))
  }
}
