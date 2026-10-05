import type { DocumentSummary } from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'
import type { DocumentRepository } from '../../ports/DocumentRepository'
import { byRecentUpdate } from '../sorting'

export class ListDocuments {
  private readonly documents: DocumentRepository

  constructor(documents: DocumentRepository) {
    this.documents = documents
  }

  /** Documents of a space, most recently updated first. */
  async execute(spaceId: SpaceId): Promise<DocumentSummary[]> {
    return (await this.documents.list(spaceId)).sort(byRecentUpdate)
  }
}
