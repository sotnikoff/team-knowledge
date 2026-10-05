import { replaceContent, type Document } from '@/domain/document/Document'
import type { RichText } from '@/domain/document/richText'
import type { Clock } from '../../ports/Clock'
import type { DocumentRepository } from '../../ports/DocumentRepository'

export class SaveDocumentContent {
  private readonly documents: DocumentRepository
  private readonly clock: Clock

  constructor(documents: DocumentRepository, clock: Clock) {
    this.documents = documents
    this.clock = clock
  }

  /**
   * `base` is the last document returned by the repository; its version is the
   * concurrency token. Continue from the returned document for the next save.
   */
  execute(base: Document, content: RichText): Promise<Document> {
    return this.documents.save(replaceContent(base, content, this.clock.now()))
  }
}
