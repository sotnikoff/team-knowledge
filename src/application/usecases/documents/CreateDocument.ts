import { newDocument, type Document } from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'
import type { DocumentRepository } from '../../ports/DocumentRepository'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateDocument {
  private readonly documents: DocumentRepository
  private readonly spaces: SpaceRepository

  constructor(documents: DocumentRepository, spaces: SpaceRepository) {
    this.documents = documents
    this.spaces = spaces
  }

  /** The repository assigns the id (and the first version / timestamps). */
  async execute(input: { spaceId: SpaceId; title: string }): Promise<Document> {
    await this.spaces.get(input.spaceId) // NotFoundError if the space is gone
    return this.documents.create(newDocument({ spaceId: input.spaceId, title: input.title }))
  }
}
